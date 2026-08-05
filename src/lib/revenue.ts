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

export type MonthBucket = {
  /** "2026-08" */
  key: string;
  /** "Aug" */
  label: string;
  /** Marks January, which is where a reader needs the year to reorient. */
  year: number;
  isYearStart: boolean;
  cents: number;
};

export type RevenueSummary = {
  allTimeCents: number;
  thisMonthCents: number;
  thisYearCents: number;
  count: number;
  averageCents: number;
  biggestCents: number;
  months: MonthBucket[];
  entries: Array<Omit<RevenueRow, "occurredAt"> & { occurredAt: string }>;
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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

  const byMonth = new Map<string, number>();

  for (const r of rows) {
    const when = r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt);
    allTimeCents += r.amountCents;
    if (r.amountCents > biggestCents) biggestCents = r.amountCents;

    const key = monthKey(when);
    if (key === thisMonth) thisMonthCents += r.amountCents;
    if (when.getFullYear() === thisYear) thisYearCents += r.amountCents;
    byMonth.set(key, (byMonth.get(key) ?? 0) + r.amountCents);
  }

  // The last 12 months, always all 12 — a month with nothing in it is information,
  // and dropping it would make the strip lie about the shape of the year.
  const months: MonthBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    months.push({
      key,
      label: MONTH_LABELS[d.getMonth()],
      year: d.getFullYear(),
      isYearStart: d.getMonth() === 0,
      cents: byMonth.get(key) ?? 0,
    });
  }

  return {
    allTimeCents,
    thisMonthCents,
    thisYearCents,
    count: rows.length,
    averageCents: rows.length ? Math.round(allTimeCents / rows.length) : 0,
    biggestCents,
    months,
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
