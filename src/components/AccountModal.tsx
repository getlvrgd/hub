"use client";

import { useActionState, useEffect } from "react";

import { changePassword, signOutEverywhere } from "@/app/actions";
import type { Session } from "@/lib/auth";

import { Modal } from "./Modal";

export function AccountModal({
  session,
  onClose,
  toast,
}: {
  session: Session;
  onClose: () => void;
  toast: (msg: string) => void;
}) {
  const [state, action, pending] = useActionState(changePassword, {});

  useEffect(() => {
    if (state.ok) {
      toast("Password changed — other devices signed out");
      onClose();
    }
  }, [state.ok, toast, onClose]);

  return (
    <Modal onClose={onClose} labelledBy="acc-title">
      <h2 id="acc-title">Password &amp; devices</h2>
      <p className="sub">Signed in as {session.email}.</p>

      <form action={action}>
        {state.error ? (
          <p className="formerr" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="field">
          <label htmlFor="cur">Current password</label>
          <input id="cur" name="current" type="password" autoComplete="current-password" required />
        </div>
        <div className="field">
          <label htmlFor="np">New password</label>
          <input
            id="np"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
          <p className="hint">At least 10 characters. Changing it signs out every other device.</p>
        </div>
        <div className="field">
          <label htmlFor="nc">New password again</label>
          <input id="nc" name="confirm" type="password" autoComplete="new-password" required />
        </div>

        <div className="modalfoot">
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button type="submit" className="btn go" disabled={pending}>
            {pending ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--divider)" }}>
        <p className="hint" style={{ marginTop: 0, marginBottom: 9 }}>
          Signed in somewhere you shouldn&apos;t be? This ends every session except
          this one, without changing your password.
        </p>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            await signOutEverywhere();
            toast("Every other device signed out");
          }}
        >
          Sign out other devices
        </button>
      </div>
    </Modal>
  );
}
