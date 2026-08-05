/**
 * Money is integer cents everywhere. Floats lose a penny somewhere around the fourth
 * deal and the total stops matching the bank.
 */

/**
 * Parses what a person actually types: "12,500", "$12,500.00", "12.5k", "1.2m".
 * Returns null when there is no number in there at all, so the form can say so
 * instead of silently booking zero.
 */
export function parseAmountToCents(input: string): number | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  const multiplier = raw.endsWith("k") ? 1_000 : raw.endsWith("m") ? 1_000_000 : 1;
  const cleaned = (multiplier === 1 ? raw : raw.slice(0, -1)).replace(/[$,\s]/g, "");
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;

  const value = Number(cleaned) * multiplier;
  if (!Number.isFinite(value) || value < 0) return null;

  // Round at the cent, not the dollar: 12.345 is 1234 cents (well, 1235 — but never 12).
  const cents = Math.round(value * 100);
  return cents > Number.MAX_SAFE_INTEGER ? null : cents;
}

/**
 * Always the full figure, never "$26.3K".
 *
 * Compact notation reads well on a marketing page and badly on a ledger: the whole
 * point of this panel is knowing what the number actually is, and $26.3K hides
 * anything from $26,250 to $26,349. Digits are set tabular in the CSS so the column
 * still lines up at full length.
 */
export function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/** "2026-08-05" in local time — what a date input expects. */
export function toDateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Reads a date input as local midday, not midnight UTC.
 *
 * `new Date("2026-08-05")` is UTC midnight, which is the 4th in every American
 * timezone — a deal booked on the 5th would land in the previous month's total for
 * anyone west of Greenwich. Midday local is far enough from both edges to survive
 * any offset.
 */
export function fromDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}
