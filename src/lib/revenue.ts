/**
 * Turning revenue rows into the handful of figures the panel shows.
 *
 * Deliberately pure and free of Prisma types so it can be tested directly, and so
 * the client gets plain serialisable data rather than model instances.
 */

export type RevenueRow = {
  id: string;
  client: string;
  offer: string | null;
  amountCents: number;
  occurredAt: Date;
  note: string | null;
};

export type RevenueSummary = {
  allTimeCents: number;
  thisMonthCents: number;
  thisYearCents: number;
  /** Number of entries — deals. */
  count: number;
  /** Distinct clients, matched case-insensitively so "Acme" and "acme" are one. */
  clientCount: number;
  averageCents: number;
  biggestCents: number;
  entries: Array<Omit<RevenueRow, "occurredAt"> & { occurredAt: string }>;
};

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/**
 * @param now injectable so tests don't depend on the day they run.
 */
export function summariseRevenue(
  rows: RevenueRow[],
  now: Date = new Date(),
): RevenueSummary {
  const thisMonth = monthKey(now);
  const thisYear = now.getFullYear();

  let allTimeCents = 0;
  let thisMonthCents = 0;
  let thisYearCents = 0;
  let biggestCents = 0;

  const clients = new Set<string>();

  for (const r of rows) {
    const when = r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt);
    allTimeCents += r.amountCents;
    if (r.amountCents > biggestCents) biggestCents = r.amountCents;

    if (monthKey(when) === thisMonth) thisMonthCents += r.amountCents;
    if (when.getFullYear() === thisYear) thisYearCents += r.amountCents;

    const name = r.client.trim().toLowerCase();
    if (name) clients.add(name);
  }

  return {
    allTimeCents,
    thisMonthCents,
    thisYearCents,
    count: rows.length,
    clientCount: clients.size,
    averageCents: rows.length ? Math.round(allTimeCents / rows.length) : 0,
    biggestCents,
    entries: rows.map((r) => ({
      id: r.id,
      client: r.client,
      offer: r.offer,
      amountCents: r.amountCents,
      note: r.note,
      occurredAt: (r.occurredAt instanceof Date
        ? r.occurredAt
        : new Date(r.occurredAt)
      ).toISOString(),
    })),
  };
}
