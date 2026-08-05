"use client";

import { useActionState, useEffect, useState } from "react";

import { addRevenue, deleteRevenue } from "@/app/actions";
import { formatMoney, toDateInput } from "@/lib/money";
import type { RevenueSummary } from "@/lib/revenue";

import { Modal } from "./Modal";
import {
  IconAvg,
  IconClients,
  IconDeals,
  IconMonth,
  IconPeak,
  IconPlus,
  IconTrash,
} from "./icons";

/**
 * What the agency has generated.
 *
 * One figure, because that is the question this answers. No chart: a single total
 * is not a shape, and twelve bars where eleven are empty said less than the number
 * itself. The supporting stats are a quiet row under it, and the entry list stays
 * folded away until you go looking for it.
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
              <span className="revstat">
                <IconDeals />
                <b>{revenue.count}</b> {revenue.count === 1 ? "Deal" : "Deals"}
              </span>
              <span className="revstat">
                <IconClients />
                <b>{revenue.clientCount}</b>{" "}
                {revenue.clientCount === 1 ? "Client" : "Clients"}
              </span>
              <span className="revstat">
                <IconAvg />
                <b>{formatMoney(revenue.averageCents)}</b> avg
              </span>
              <span className="revstat">
                <IconPeak />
                <b>{formatMoney(revenue.biggestCents)}</b> biggest
              </span>
              <span className="revstat">
                <IconMonth />
                <b>{formatMoney(revenue.thisMonthCents)}</b> this month
              </span>
            </div>
          ) : null}
        </div>

        {revenue.count ? (
          <div className="revfold">
            <button
              className="revfoldbtn"
              onClick={() => setShowList((v) => !v)}
              aria-expanded={showList}
            >
              {showList ? "Hide entries" : `${revenue.count} entries`}
            </button>
          </div>
        ) : null}

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
