"use client";

import { useState } from "react";
import ReportReviewButton from "./ReportReviewButton";
import { AdminReplyControls } from "./AdminProfileControls";

export type ReplyItem = {
  id: string;
  body: string;
  authorRole: string | null;
  date: string;
};

const MAX_LENGTH = 1500;

export default function ReviewReplies({
  reviewId,
  replies,
  isAdmin = false,
}: {
  reviewId: string;
  replies: ReplyItem[];
  isAdmin?: boolean;
}) {
  // Seeded from the server render, then extended locally so a new reply shows
  // up immediately without a full page reload.
  const [items, setItems] = useState(replies);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState("");

  async function submit() {
    const trimmed = body.trim();
    if (trimmed.length < 5) {
      setError("Write at least a few words.");
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      const res = await fetch(`/api/reviews/${reviewId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed, authorRole: authorRole.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not post reply.");

      setItems((current) => [...current, data.reply]);
      setBody("");
      setAuthorRole("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post reply.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="review-replies">
      {items.length > 0 && (
        <ul className="reply-list">
          {items.map((reply) => (
            <li className="reply-item" key={reply.id} id={`reply-${reply.id}`}>
              <div className="reply-head">
                <strong>{reply.authorRole || "Anonymous"}</strong>
                <span>
                  {new Date(reply.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p>{reply.body}</p>
              <div className="reply-actions">
                <ReportReviewButton reviewId={reviewId} replyId={reply.id} label="Report reply" />
                {isAdmin && <AdminReplyControls replyId={reply.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="reply-form">
          <textarea
            className="field-input"
            placeholder="Add context, agree, or share a different experience…"
            value={body}
            maxLength={MAX_LENGTH}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            autoFocus
          />
          <input
            className="field-input"
            placeholder="How to label you (optional) — e.g. Former teammate"
            value={authorRole}
            maxLength={60}
            onChange={(e) => setAuthorRole(e.target.value)}
          />
          {error && <div className="reply-error">{error}</div>}
          <div className="reply-form-actions">
            <span className="reply-counter">
              {body.trim().length}/{MAX_LENGTH}
            </span>
            <button
              type="button"
              className="reply-cancel"
              onClick={() => {
                setOpen(false);
                setError("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary reply-submit"
              onClick={submit}
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Posting…" : "Post reply"}
            </button>
          </div>
          <p className="reply-disclaimer">
            Replies are public and anonymous. Don&apos;t include names or details that identify anyone.
          </p>
        </div>
      ) : (
        <button type="button" className="reply-open" onClick={() => setOpen(true)}>
          {items.length ? "Add a reply" : "Reply to this review"}
        </button>
      )}
    </div>
  );
}
