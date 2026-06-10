"use client";

import { useState } from "react";

const REPORT_REASONS = [
  "This review isn't about me / wrong manager",
  "False or misleading",
  "Contains private or identifying information",
  "Harassment, hate speech, or threats",
  "Spam or fake review",
  "Other",
];

export default function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState("");

  function close() {
    setOpen(false);
    setReason("");
    setDetails("");
    setStatus("idle");
    setError("");
  }

  async function submit() {
    if (!reason) {
      setError("Please choose a reason.");
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, reason, details }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not submit report.");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not submit report.");
    }
  }

  return (
    <>
      <button type="button" className="report-review-link" onClick={() => setOpen(true)}>
        Report review
      </button>

      {open && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="modal-card">
            <button className="modal-close" onClick={close} aria-label="Close">×</button>

            {status === "done" ? (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                  Report received
                </h2>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: 0 }}>
                  Thanks — our team has been notified and will review this submission.
                </p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
                  Report this review
                </h2>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
                  Let us know what's wrong. We'll review it and follow up if needed.
                </p>

                <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                  {REPORT_REASONS.map((option) => (
                    <label
                      key={option}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#334155",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={option}
                        checked={reason === option}
                        onChange={() => setReason(option)}
                        style={{ marginTop: 2, accentColor: "#5b2df5" }}
                      />
                      {option}
                    </label>
                  ))}
                </div>

                <textarea
                  className="field-input"
                  placeholder="Additional details (optional)"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  style={{ resize: "vertical", marginBottom: 12 }}
                />

                {error && (
                  <div style={{ fontSize: 13, color: "#b91c1c", marginBottom: 12, fontWeight: 600 }}>
                    {error}
                  </div>
                )}

                <button
                  className="btn-primary"
                  style={{ width: "100%", padding: "13px", fontSize: 14, borderRadius: 8 }}
                  onClick={submit}
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? "Submitting…" : "Submit report"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
