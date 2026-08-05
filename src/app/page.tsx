import { redirect } from "next/navigation";

import { Hub } from "@/components/Hub";
import { getSession, hasAnyUser } from "@/lib/auth";
import { normaliseBoard, starterBoard } from "@/lib/board";
import { prisma } from "@/lib/db";
import { summariseRevenue } from "@/lib/revenue";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await hasAnyUser())) redirect("/setup");

  const session = await getSession();
  if (!session) redirect("/login");

  // The board row is created with the account, but a hub restored from a database
  // snapshot could be missing it — seed rather than render an empty page.
  const row = await prisma.board.findUnique({ where: { userId: session.userId } });
  const board = row ? normaliseBoard(row.data) : starterBoard();

  const entries = await prisma.revenueEntry.findMany({
    where: { userId: session.userId },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  return (
    <Hub
      session={session}
      board={board}
      revenue={summariseRevenue(entries)}
    />
  );
}
