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

/** One time window and what landed inside it. */
export type RevenueWindow = {
  key: string;
  label: string;
  cents: number;
};

export type RevenueSummary = {
  allTimeCents: number;
  /** In display order, widest window first. */
  windows: RevenueWindow[];
  /** Number of entries. */
  count: number;
  entries: Array<Omit<RevenueRow, "occurredAt"> & { occurredAt: string }>;
};

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

/** N days back, counting today as one of them: daysAgo(7) is a 7-day window. */
const daysAgo = (from: Date, n: number) => {
  const d = startOfDay(from);
  d.setDate(d.getDate() - (n - 1));
  return d;
};

/**
 * @param now injectable so tests don't depend on the day they run.
 */
export function summariseRevenue(
  rows: RevenueRow[],
  now: Date = new Date(),
): RevenueSummary {
  /*
   * Windows are half-open [start, endOfToday]: everything is anchored to local
   * midnight, and nothing dated in the future counts toward a window that has not
   * happened yet. A deal booked for next month still shows in the all-time total,
   * which is the only figure that claims to include it.
   *
   * "Last N days" counts today as one of the N, which is what people mean by it.
   * The calendar windows — year and month to date — start at the 1st.
   */
  const endOfToday = startOfDay(now);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const defs: Array<{ key: string; label: string; from: Date }> = [
    { key: "d365", label: "Last 365 days", from: daysAgo(now, 365) },
    { key: "ytd", label: "Year to date", from: new Date(now.getFullYear(), 0, 1) },
    { key: "d90", label: "Last 90 days", from: daysAgo(now, 90) },
    { key: "mtd", label: "Month to date", from: new Date(now.getFullYear(), now.getMonth(), 1) },
    { key: "d7", label: "Last 7 days", from: daysAgo(now, 7) },
    { key: "today", label: "Today", from: startOfDay(now) },
  ];

  let allTimeCents = 0;
  const totals = new Map<string, number>(defs.map((d) => [d.key, 0]));

  for (const r of rows) {
    const when = r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt);
    allTimeCents += r.amountCents;
    if (when >= endOfToday) continue;

    for (const d of defs) {
      if (when >= d.from) totals.set(d.key, totals.get(d.key)! + r.amountCents);
    }
  }

  return {
    allTimeCents,
    windows: defs.map((d) => ({ key: d.key, label: d.label, cents: totals.get(d.key)! })),
    count: rows.length,
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
