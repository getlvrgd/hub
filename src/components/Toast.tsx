"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** A brief, non-blocking confirmation. Never used for anything you must act on. */
export function Toast({ message }: { message: string | null }) {
  return (
    <div className={`toast${message ? " on" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2400);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { toast, toastNode: <Toast message={message} /> };
}
