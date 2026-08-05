"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "hub:theme";
const ORDER = ["system", "light", "dark"] as const;
type Theme = (typeof ORDER)[number];

const ICONS: Record<Theme, React.ReactNode> = {
  system: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" />
    </>
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.1 5.1l1.4 1.4M17.5 17.5l1.4 1.4M18.9 5.1l-1.4 1.4M6.5 17.5l-1.4 1.4" />
    </>
  ),
  dark: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
};

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("hub:theme", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("hub:theme", cb);
  };
}

/**
 * Light / dark / follow-the-system.
 *
 * "System" is a real third state, not a synonym for light: a Mac that switches at
 * sunset should switch this too unless told otherwise. Choosing light or dark stamps
 * `data-theme` on <html>, which every token in globals.css obeys ahead of the media
 * query. The stored choice is applied before first paint by the inline script in the
 * root layout.
 */
export function ThemeToggle() {
  // The stored preference is external state, so it is subscribed to rather than
  // copied into an effect. The server snapshot is null, which hydrates as "system".
  const raw = useSyncExternalStore(
    subscribe,
    useCallback(() => {
      try {
        return localStorage.getItem(KEY);
      } catch {
        return null;
      }
    }, []),
    () => null,
  );
  const theme: Theme = raw === "light" || raw === "dark" ? raw : "system";

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* private mode — the toggle still works for this page view */
    }
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    window.dispatchEvent(new Event("hub:theme"));
  };

  return (
    <button
      className="iconbtn"
      onClick={cycle}
      title={`Theme: ${theme}`}
      aria-label={`Theme: ${theme}. Click to change.`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICONS[theme]}
      </svg>
    </button>
  );
}
