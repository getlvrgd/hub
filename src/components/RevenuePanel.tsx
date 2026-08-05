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
 * One figure, because that is the question this answers. No chart: a single total
 * is not a shape, and twelve bars where eleven are empty said less than the number
 * itself.
 *
 * Under it, the same measure over narrowing time windows — the row reads as one
 * thought, "and how much of that was recently", rather than six unrelated stats.
 * The entry list stays folded away until you go looking for it.
 *
 * Every number wears an ink token — nothing here is coloured to mean something.
 */
export function RevenuePanel({
  revenue,
  toast,
}: {
  revenue: RevenueSummary;
  toast: (msg: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [showList, setShowList] = useState(false);

  return (
    <section>
      <div className="sechead">
        <span className="sectoggle" style={{ cursor: "default" }}>
          <span className="sectitle">Agency revenue</span>
          <span className="seccount">{revenue.count}</span>
        </span>
        <span className="secline" />
        {/* Both controls live on the header rule, so the panel itself stays just
            the figure. The count is already on the chip beside the title, which is
            why this says "Entries" rather than repeating the number. */}
        {revenue.count ? (
          <button
            className="secact"
            onClick={() => setShowList((v) => !v)}
            aria-expanded={showList}
          >
            {showList ? "Hide" : "Entries"}
          </button>
        ) : null}
        <button className="secact" onClick={() => setAdding(true)}>
          + Log revenue
        </button>
      </div>

      <div className="revpanel">
        <div className="revhero">
          <div className="revbig">{formatMoney(revenue.allTimeCents)}</div>
          <div className="revcap">Total agency revenue</div>

          {revenue.count ? (
            <div className="revstats">
              {revenue.windows.map((w) => (
                <span className="revstat" key={w.key}>
                  <b>{formatMoney(w.cents)}</b>
                  {w.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {revenue.count && showList ? (
          <div className="revlist">
            {revenue.entries.map((e) => (
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
          </div>
        ) : null}

        {!revenue.count ? (
          <div className="revempty">
            Nothing logged yet — <button onClick={() => setAdding(true)}>add the first one</button>.
          </div>
        ) : null}
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
