"use client";

import { useActionState, useState } from "react";

import { signIn } from "@/app/actions";
import { Logo } from "./Logo";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});

  // Controlled, so a wrong password doesn't also clear the email — see SetupForm.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="authwrap">
      <form className="authcard" action={action}>
        <div className="mark">
          <Logo />
          <span className="brandrule" />
          <span className="brandname">Hub</span>
        </div>

        <h1>Sign in</h1>
        <p className="lede">This hub is private. Everything in it syncs to whatever you sign in on.</p>

        {state.error ? (
          <p className="formerr" role="alert">
            {state.error}
          </p>
        ) : null}

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
            autoFocus
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
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" className="btn go" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
