import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { prisma } from "./db";

const COOKIE = "hub_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Session = {
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "VIEWER";
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    // Failing loudly beats silently signing sessions with a guessable key.
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters. Set it in .env.",
    );
  }
  return new TextEncoder().encode(value);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

/** Same bcrypt cost as a real hash, to burn the same time on a miss. */
const DUMMY_HASH = "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";

/**
 * Verifies a login. Returns null for both "no such account" and "wrong password", and
 * spends the same time either way, so neither the response nor the clock can be used
 * to discover which email addresses exist.
 */
export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), isActive: true },
  });
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function createSession(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  sessionEpoch: number;
}) {
  const token = await new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    epoch: user.sessionEpoch,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * Who is asking, or null.
 *
 * A valid signature is not enough on its own: the account is re-read and the token's
 * epoch compared against it. That is what makes "sign out everywhere" and a password
 * change actually end the sessions already out there — a stolen cookie stays valid
 * for its full 30 days otherwise, and this app holds revenue figures.
 *
 * One indexed primary-key lookup per request is the price, which for a hub this size
 * is nothing next to being able to revoke.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        sessionEpoch: true,
      },
    });
    if (!user || !user.isActive) return null;
    if (user.sessionEpoch !== Number(payload.epoch ?? -1)) return null;

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role === "VIEWER" ? "VIEWER" : "OWNER",
    };
  } catch {
    // Expired or tampered token — treat as signed out.
    return null;
  }
}

/** True once an account exists, which is what permanently closes /setup. */
export async function hasAnyUser() {
  return (await prisma.user.count()) > 0;
}
