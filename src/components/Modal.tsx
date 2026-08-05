"use client";

import { useEffect, useRef } from "react";

/**
 * The shared dialog shell: a scrim you can click out of, Escape to close, and focus
 * moved inside on open so the keyboard follows the eye. Everything that opens over
 * the board uses this, so those behaviours can't drift apart between dialogs.
 */
export function Modal({
  children,
  onClose,
  labelledBy,
}: {
  children: React.ReactNode;
  onClose: () => void;
  labelledBy?: string;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    // The first field, or the dialog itself when there isn't one.
    const first = box.current?.querySelector<HTMLElement>(
      "input:not([type=hidden]), select, textarea, button",
    );
    first?.focus();
  }, []);

  return (
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  );
}
