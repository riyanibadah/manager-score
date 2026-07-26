"use client";

import { useEffect, useState } from "react";

const TOKENS_KEY = "rmm_review_tokens_v1";

function readToken(reviewId: string) {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    const tokens = raw ? JSON.parse(raw) : {};
    return typeof tokens[reviewId] === "string" ? tokens[reviewId] : null;
  } catch {
    return null;
  }
}

function forgetToken(reviewId: string) {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    const tokens = raw ? JSON.parse(raw) : {};
    delete tokens[reviewId];
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } catch {}
}

export default function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setToken(readToken(reviewId));
  }, [reviewId]);

  if (!token) return null;

  async function handleDelete() {
    if (!confirm("Delete your review? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not delete review.");
      forgetToken(reviewId);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete review.");
      setBusy(false);
    }
  }

  return (
    <span className="delete-review-actions">
      <button type="button" className="delete-review-link" onClick={handleDelete} disabled={busy}>
        {busy ? "Deleting…" : "Delete my review"}
      </button>
      {error ? <span className="delete-review-error">{error}</span> : null}
    </span>
  );
}
