"use client";

import { useEffect, useState } from "react";

export default function NotifyReviewButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    setStatus("idle");
    setEmail("");
    setMessage("");
    setError("");
  }

  async function submit() {
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      const res = await fetch(`/api/reviews/${reviewId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not set up notifications.");

      setMessage(data?.message || "Check your inbox to confirm.");
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Could not set up notifications.");
    }
  }

  return (
    <>
      <button
        type="button"
        className="notify-review-link"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        Notify me
      </button>

      {open && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="modal-card notify-modal" role="dialog" aria-modal="true" aria-label="Get reply notifications">
            <button className="modal-close" onClick={close} aria-label="Close">×</button>

            {status === "done" ? (
              <>
                <h2 className="notify-modal-title">One more step</h2>
                <p className="notify-modal-subtitle">{message}</p>
              </>
            ) : (
              <>
                <h2 className="notify-modal-title">Email me about replies</h2>
                <p className="notify-modal-subtitle">
                  We&apos;ll email you whenever someone replies to this review. Your address is never
                  shown on the site and never linked to a review.
                </p>

                <input
                  className="field-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  aria-label="Email address"
                  autoFocus
                />

                {error && <div className="notify-error">{error}</div>}

                <button
                  className="btn-primary notify-submit"
                  onClick={submit}
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? "Sending…" : "Notify me of replies"}
                </button>

                <p className="notify-fineprint">
                  You&apos;ll get a confirmation email first — alerts only start once you click the
                  link in it. Unsubscribe from any alert in one click.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
