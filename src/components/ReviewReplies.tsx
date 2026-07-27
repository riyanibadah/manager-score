"use client";

import { useState } from "react";
import ReportReviewButton from "./ReportReviewButton";
import { AdminReplyControls } from "./AdminProfileControls";
import VoteButtons from "./VoteButtons";

export type ReplyItem = {
  id: string;
  parentId: string | null;
  body: string;
  authorRole: string | null;
  upvotes: number;
  downvotes: number;
  date: string;
};

type ReplyNode = ReplyItem & { children: ReplyNode[] };

const MAX_LENGTH = 1500;
/** Past this depth replies stop indenting, so deep threads stay readable on phones. */
const MAX_INDENT_DEPTH = 3;

export default function ReviewReplies({
  reviewId,
  replies,
  isAdmin = false,
  myVotes = {},
}: {
  reviewId: string;
  replies: ReplyItem[];
  isAdmin?: boolean;
  /** Reply id -> this voter's existing vote, so arrows render pre-selected. */
  myVotes?: Record<string, number>;
}) {
  // Seeded from the server render, then extended locally so a new reply shows
  // up immediately without a full page reload.
  const [items, setItems] = useState(replies);
  // Which reply the open composer is answering; null means the review itself,
  // undefined means no composer is open.
  const [replyingTo, setReplyingTo] = useState<string | null | undefined>(undefined);

  function addReply(reply: ReplyItem) {
    setItems((current) => [...current, reply]);
    setReplyingTo(undefined);
  }

  const tree = buildTree(items);

  return (
    <div className="review-replies">
      {tree.length > 0 && (
        <ul className="reply-list">
          {tree.map((node) => (
            <ReplyBranch
              key={node.id}
              node={node}
              depth={0}
              reviewId={reviewId}
              isAdmin={isAdmin}
              myVotes={myVotes}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              onAdded={addReply}
            />
          ))}
        </ul>
      )}

      {replyingTo === null ? (
        <ReplyComposer
          reviewId={reviewId}
          parentId={null}
          onAdded={addReply}
          onCancel={() => setReplyingTo(undefined)}
        />
      ) : (
        <button type="button" className="reply-open" onClick={() => setReplyingTo(null)}>
          {items.length ? "Add a reply" : "Reply to this review"}
        </button>
      )}
    </div>
  );
}

function ReplyBranch({
  node,
  depth,
  reviewId,
  isAdmin,
  myVotes,
  replyingTo,
  setReplyingTo,
  onAdded,
}: {
  node: ReplyNode;
  depth: number;
  reviewId: string;
  isAdmin: boolean;
  myVotes: Record<string, number>;
  replyingTo: string | null | undefined;
  setReplyingTo: (id: string | null | undefined) => void;
  onAdded: (reply: ReplyItem) => void;
}) {
  return (
    <li className="reply-item" id={`reply-${node.id}`}>
      <div className="reply-head">
        <strong>{node.authorRole || "Anonymous"}</strong>
        <span>
          {new Date(node.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
      <p>{node.body}</p>
      <div className="reply-actions">
        <VoteButtons
          target={{ replyId: node.id }}
          upvotes={node.upvotes}
          downvotes={node.downvotes}
          myVote={myVotes[node.id] || 0}
          size="small"
        />
        <button type="button" className="reply-open" onClick={() => setReplyingTo(node.id)}>
          Reply
        </button>
        <ReportReviewButton reviewId={reviewId} replyId={node.id} label="Report reply" />
        {isAdmin && <AdminReplyControls replyId={node.id} />}
      </div>

      {replyingTo === node.id && (
        <ReplyComposer
          reviewId={reviewId}
          parentId={node.id}
          onAdded={onAdded}
          onCancel={() => setReplyingTo(undefined)}
        />
      )}

      {node.children.length > 0 && (
        <ul className={`reply-list reply-children${depth >= MAX_INDENT_DEPTH ? " reply-children-flat" : ""}`}>
          {node.children.map((child) => (
            <ReplyBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              reviewId={reviewId}
              isAdmin={isAdmin}
              myVotes={myVotes}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              onAdded={onAdded}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function ReplyComposer({
  reviewId,
  parentId,
  onAdded,
  onCancel,
}: {
  reviewId: string;
  parentId: string | null;
  onAdded: (reply: ReplyItem) => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const trimmed = body.trim();
    if (trimmed.length < 5) {
      setError("Write at least a few words.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/reviews/${reviewId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: trimmed,
          authorRole: authorRole.trim() || undefined,
          parentId: parentId || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not post reply.");

      onAdded(data.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post reply.");
      setSubmitting(false);
    }
  }

  return (
    <div className="reply-form">
      <textarea
        className="field-input"
        placeholder={
          parentId
            ? "Reply to this comment…"
            : "Add context, agree, or share a different experience…"
        }
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
        <button type="button" className="reply-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary reply-submit"
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? "Posting…" : "Post reply"}
        </button>
      </div>
      <p className="reply-disclaimer">
        Replies are public and anonymous. Don&apos;t include names or details that identify anyone.
      </p>
    </div>
  );
}

function buildTree(items: ReplyItem[]): ReplyNode[] {
  const nodes = new Map<string, ReplyNode>();
  for (const item of items) {
    nodes.set(item.id, { ...item, children: [] });
  }

  const roots: ReplyNode[] = [];
  for (const node of nodes.values()) {
    // A reply whose parent isn't in the list (hidden or deleted by a moderator)
    // is promoted to the top level rather than disappearing with it.
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}
