"use client";

import { useState } from "react";

type VoteTarget = { reviewId: string; replyId?: never } | { replyId: string; reviewId?: never };

export default function VoteButtons({
  target,
  upvotes,
  downvotes,
  myVote = 0,
  size = "default",
}: {
  target: VoteTarget;
  upvotes: number;
  downvotes: number;
  myVote?: number;
  size?: "default" | "small";
}) {
  const [tally, setTally] = useState({ up: upvotes, down: downvotes });
  const [vote, setVote] = useState(myVote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cast(next: 1 | -1) {
    if (busy) return;

    // Clicking the arrow you already chose clears the vote.
    const value = vote === next ? 0 : next;
    const previous = { tally, vote };

    // Optimistic: the arrows respond instantly, and the server's authoritative
    // totals overwrite this a moment later.
    setTally({
      up: tally.up + ((value === 1 ? 1 : 0) - (vote === 1 ? 1 : 0)),
      down: tally.down + ((value === -1 ? 1 : 0) - (vote === -1 ? 1 : 0)),
    });
    setVote(value);
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, value }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not record vote.");

      setTally({ up: data.upvotes, down: data.downvotes });
      setVote(data.myVote);
    } catch (err) {
      setTally(previous.tally);
      setVote(previous.vote);
      setError(err instanceof Error ? err.message : "Could not record vote.");
    } finally {
      setBusy(false);
    }
  }

  const score = tally.up - tally.down;

  return (
    <span className={`vote-group${size === "small" ? " vote-group-small" : ""}`} title={error || undefined}>
      <button
        type="button"
        className={`vote-btn${vote === 1 ? " vote-btn-up-active" : ""}`}
        onClick={() => cast(1)}
        aria-label="Upvote"
        aria-pressed={vote === 1}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
      <span className={`vote-score${score > 0 ? " vote-score-up" : score < 0 ? " vote-score-down" : ""}`}>
        {score}
      </span>
      <button
        type="button"
        className={`vote-btn${vote === -1 ? " vote-btn-down-active" : ""}`}
        onClick={() => cast(-1)}
        aria-label="Downvote"
        aria-pressed={vote === -1}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </button>
    </span>
  );
}
