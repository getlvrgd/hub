"use client";

import { useActionState, useState } from "react";

import { createOwner } from "@/app/actions";
import { Logo } from "./Logo";

export function SetupForm() {
  const [state, action, pending] = useActionState(createOwner, {});

  // Controlled on purpose. React resets an uncontrolled form once its action
  // returns, so a rejected password would also silently wipe the name and email
  // that were fine — and you would retype all four fields to fix one.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <div className="authwrap">
      <form className="authcard" action={action}>
        <div className="mark">
          <Logo />
          <span className="brandrule" />
          <span className="brandname">Hub</span>
        </div>

        <h1>Set your login</h1>
        <p className="lede">
          This is the only account this hub will ever have, and this page closes as
          soon as you create it. Pick a password you don&apos;t use anywhere else.
        </p>

        {state.error ? (
          <p className="formerr" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="field">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            maxLength={80}
            placeholder="Felix"
          />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            placeholder="you@lvrgd.co"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={10}
          />
          <p className="hint">At least 10 characters.</p>
        </div>

        <div className="field">
          <label htmlFor="confirm">Password again</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <button type="submit" className="btn go" disabled={pending}>
          {pending ? "Creating…" : "Create my login"}
        </button>
      </form>
    </div>
  );
}
