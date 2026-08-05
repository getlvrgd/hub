"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createSession,
  destroySession,
  getSession,
  hasAnyUser,
  hashPassword,
  verifyCredentials,
} from "@/lib/auth";
import { normaliseBoard, starterBoard, type BoardDoc } from "@/lib/board";
import { prisma } from "@/lib/db";
import { fromDateInput, parseAmountToCents } from "@/lib/money";

export type FormState = { error?: string; ok?: boolean };

/**
 * Every mutation below starts here rather than trusting the page that called it.
 * A server action is a public POST endpoint — hiding a button is never the control.
 */
async function requireOwner() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "OWNER") throw new Error("Read-only account.");
  return session;
}

/* ------------------------------------------------------------------ auth */

const credentials = z.object({
  email: z.string().email("That isn't an email address.").max(200),
  password: z.string().min(1, "Enter your password."),
});

export async function signIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = credentials.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check those details." };
  }

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  // One message for both failures, so this can't be used to find out which
  // addresses have accounts.
  if (!user) return { error: "That email and password don't match." };

  await createSession(user);
  redirect("/");
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}

/** Ends every other session by invalidating the epoch their tokens carry. */
export async function signOutEverywhere() {
  const session = await requireOwner();
  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { sessionEpoch: { increment: 1 } },
    select: { id: true, name: true, email: true, role: true, sessionEpoch: true },
  });
  // Re-issue this device's cookie at the new epoch so you aren't signing yourself out.
  await createSession(user);
  revalidatePath("/");
  return { ok: true };
}

const setup = z
  .object({
    name: z.string().trim().min(1, "What should it call you?").max(80),
    email: z.string().email("That isn't an email address.").max(200),
    password: z
      .string()
      .min(10, "Use at least 10 characters — this is the only lock on the door."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Those two passwords don't match.",
  });

/**
 * Creates the one account. Closes permanently the moment a user exists, so there is
 * never a public page that mints access to the hub.
 */
export async function createOwner(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (await hasAnyUser()) return { error: "This hub already has an account." };

  const parsed = setup.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check those details." };
  }

  const { name, email, password } = parsed.data;
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash: await hashPassword(password),
      role: "OWNER",
      board: { create: { data: starterBoard() as unknown as object } },
    },
    select: { id: true, name: true, email: true, role: true, sessionEpoch: true },
  });

  await createSession(user);
  redirect("/");
}

const passwordChange = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    password: z.string().min(10, "Use at least 10 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Those two passwords don't match.",
  });

export async function changePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireOwner();
  const parsed = passwordChange.safeParse({
    current: String(formData.get("current") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check those details." };
  }

  const ok = await verifyCredentials(session.email, parsed.data.current);
  if (!ok) return { error: "That current password isn't right." };

  // Bumping the epoch signs out every other device, which is the point of
  // changing a password in the first place.
  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      sessionEpoch: { increment: 1 },
    },
    select: { id: true, name: true, email: true, role: true, sessionEpoch: true },
  });
  await createSession(user);
  return { ok: true };
}

/* ----------------------------------------------------------------- board */

/**
 * The board is written whole.
 *
 * Every interaction that changes it — a drag between sections, a collapse, a rename —
 * changes the arrangement rather than one field, so there is no smaller unit to send.
 * The client owns the arrangement and posts the result; the server re-normalises it
 * before storing, so nothing gets in that `normaliseBoard` would not accept back out.
 */
export async function saveBoard(doc: BoardDoc) {
  const session = await requireOwner();
  const clean = normaliseBoard(doc);

  await prisma.board.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, data: clean as unknown as object },
    update: { data: clean as unknown as object },
  });

  revalidatePath("/");
  return { ok: true as const };
}

/** Click-through counts feed search ranking; they are not worth a full board write. */
export async function recordOpen(destinationId: string) {
  const session = await getSession();
  if (!session) return { ok: false as const };

  const row = await prisma.board.findUnique({ where: { userId: session.userId } });
  if (!row) return { ok: false as const };

  const doc = normaliseBoard(row.data);
  const hit = doc.destinations.find((d) => d.id === destinationId);
  if (!hit) return { ok: false as const };
  hit.opens += 1;

  await prisma.board.update({
    where: { userId: session.userId },
    data: { data: doc as unknown as object },
  });
  return { ok: true as const };
}

/* --------------------------------------------------------------- revenue */

export async function addRevenue(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireOwner();

  const client = String(formData.get("client") ?? "").trim();
  const offer = String(formData.get("offer") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const cents = parseAmountToCents(String(formData.get("amount") ?? ""));
  const when = fromDateInput(String(formData.get("occurredAt") ?? ""));

  if (!client) return { error: "Who was it from?" };
  if (cents === null) return { error: "That amount doesn't look like a number." };
  if (cents === 0) return { error: "An amount of zero won't tell you much." };
  if (!when) return { error: "Pick a date." };

  await prisma.revenueEntry.create({
    data: {
      userId: session.userId,
      client: client.slice(0, 120),
      offer: offer ? offer.slice(0, 80) : null,
      note: note ? note.slice(0, 300) : null,
      amountCents: cents,
      occurredAt: when,
    },
  });

  revalidatePath("/");
  return { ok: true };
}

export async function deleteRevenue(id: string) {
  const session = await requireOwner();
  // Scoped by userId as well as id, so a guessed id from another account is a no-op
  // rather than a delete.
  await prisma.revenueEntry.deleteMany({ where: { id, userId: session.userId } });
  revalidatePath("/");
  return { ok: true as const };
}
