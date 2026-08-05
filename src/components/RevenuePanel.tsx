"use client";

import { useActionState, useEffect, useState } from "react";

import { addRevenue, deleteRevenue } from "@/app/actions";
import { formatMoney, toDateInput } from "@/lib/money";
import type { RevenueSummary } from "@/lib/revenue";

import { Modal } from "./Modal";
import { IconPlus, IconTrash } from "./icons";

/**
 * What the agency has generated.
 *
 * The headline is one number, so it is a number — not a chart with a single bar in
 * it. The month strip beneath is the only place a mark carries data, and it is one
 * series in one hue: every figure on screen wears an ink token, and colour never
 * stands in for a label.
 */
export function RevenuePanel({
  revenue,
  toast,
}: {
  revenue: RevenueSummary;
  toast: (msg: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const peak = Math.max(...revenue.months.map((m) => m.cents), 1);
  const shown = showAll ? revenue.entries : revenue.entries.slice(0, 6);

  return (
    <section>
      <div className="sechead">
        <span className="sectoggle" style={{ cursor: "default" }}>
          <span className="sectitle">Agency revenue</span>
          <span className="seccount">{revenue.count}</span>
        </span>
        <span className="secline" />
        <button className="secact" onClick={() => setAdding(true)}>
          + Log revenue
        </button>
      </div>

      <div className="revpanel">
        <div className="revtop">
          <div className="revhero">
            <div className="revlabel">Generated all time</div>
            <div className="revbig">{formatMoney(revenue.allTimeCents)}</div>
          </div>

          <div className="revtiles">
            <div className="revtile">
              <div className="revlabel">This month</div>
              <div className="v">{formatMoney(revenue.thisMonthCents)}</div>
            </div>
            <div className="revtile">
              <div className="revlabel">This year</div>
              <div className="v">{formatMoney(revenue.thisYearCents)}</div>
            </div>
            <div className="revtile">
              <div className="revlabel">Average deal</div>
              <div className="v">{formatMoney(revenue.averageCents)}</div>
              <div className="sub">
                across {revenue.count} {revenue.count === 1 ? "entry" : "entries"}
              </div>
            </div>
            <div className="revtile">
              <div className="revlabel">Biggest</div>
              <div className="v">{formatMoney(revenue.biggestCents)}</div>
            </div>
          </div>
        </div>

        {revenue.count ? (
          <div className="revmonths" aria-hidden="true">
            {revenue.months.map((m) => (
              <div
                key={m.key}
                className={`mbar${m.cents ? "" : " zero"}`}
                title={`${m.label} ${m.year} — ${formatMoney(m.cents)}`}
              >
                <i style={{ height: `${Math.max((m.cents / peak) * 100, m.cents ? 6 : 2)}%` }} />
                <span>{m.isYearStart ? `${m.label} ${String(m.year).slice(2)}` : m.label}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* The bars are decorative once this table exists — same numbers, readable. */}
        {revenue.count ? (
          <div className="revlist">
            {shown.map((e) => (
              <div className="revrow" key={e.id}>
                <span className="who">
                  {e.client}
                  {e.offer || e.note ? (
                    <small>{[e.offer, e.note].filter(Boolean).join(" · ")}</small>
                  ) : null}
                </span>
                <span className="amt">{formatMoney(e.amountCents)}</span>
                <span className="when">
                  {new Date(e.occurredAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "2-digit",
                  })}
                </span>
                <button
                  className="tool del"
                  aria-label={`Delete ${e.client}`}
                  onClick={async () => {
                    if (!confirm(`Delete ${formatMoney(e.amountCents)} from ${e.client}?`)) return;
                    await deleteRevenue(e.id);
                    toast("Deleted");
                  }}
                >
                  <IconTrash />
                </button>
              </div>
            ))}
            {revenue.entries.length > 6 ? (
              <div className="revrow" style={{ justifyContent: "center" }}>
                <button className="secact" onClick={() => setShowAll((v) => !v)}>
                  {showAll
                    ? "Show less"
                    : `Show all ${revenue.entries.length} entries`}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ padding: "6px 22px 22px" }}>
            <div className="empty" style={{ padding: "26px 18px" }}>
              <b>No revenue logged yet.</b>
              Add what the agency has brought in and the totals build from there.
            </div>
          </div>
        )}
      </div>

      {adding ? <AddRevenue onClose={() => setAdding(false)} toast={toast} /> : null}
    </section>
  );
}

function AddRevenue({ onClose, toast }: { onClose: () => void; toast: (m: string) => void }) {
  const [state, action, pending] = useActionState(addRevenue, {});

  // Controlled, so a rejected amount doesn't also wipe the client, offer and note
  // that were entered correctly — React clears an uncontrolled form after its action.
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [when, setWhen] = useState(toDateInput(new Date()));
  const [offer, setOffer] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (state.ok) {
      toast("Logged");
      onClose();
    }
  }, [state.ok, toast, onClose]);

  return (
    <Modal onClose={onClose} labelledBy="rev-title">
      <form action={action}>
        <h2 id="rev-title">Log revenue</h2>
        <p className="sub">One row per deal or payment. Backdate it if it already landed.</p>

        {state.error ? (
          <p className="formerr" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="field">
          <label htmlFor="rc">Who from</label>
          <input
            id="rc"
            name="client"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            required
            maxLength={120}
            placeholder="Client or deal name"
          />
        </div>

        <div className="row2">
          <div className="field">
            <label htmlFor="ra">Amount</label>
            <input
              id="ra"
              name="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              inputMode="decimal"
              placeholder="12,500"
            />
            <p className="hint">$12,500 · 12.5k · 1.2m all work.</p>
          </div>
          <div className="field">
            <label htmlFor="rd">Date</label>
            <input
              id="rd"
              name="occurredAt"
              type="date"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="ro">Offer <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
          <input
            id="ro"
            name="offer"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            maxLength={80}
            placeholder="Which offer it came from"
          />
        </div>

        <div className="field">
          <label htmlFor="rn">Note <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
          <input
            id="rn"
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder="Anything worth remembering"
          />
        </div>

        <div className="modalfoot">
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn go" disabled={pending}>
            <IconPlus /> {pending ? "Saving…" : "Log it"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
