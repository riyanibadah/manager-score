"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";

type Comment = { id: string; authorName: string; body: string; createdAt: string };

export default function BlogComments({
  slug,
  initialComments,
  isAdmin,
}: {
  slug: string;
  initialComments: Comment[];
  isAdmin: boolean;
}) {
  const session = authClient.useSession();
  const signedIn = Boolean(session.data?.user);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/blog/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, body: text.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not post comment.");
      setComments((c) => [...c, { id: data.id, authorName: data.authorName, body: data.body, createdAt: data.createdAt }]);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post comment.");
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: typeof window !== "undefined" ? window.location.href : undefined,
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this comment?")) return;
    const res = await fetch(`/api/admin/blog-comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments((c) => c.filter((x) => x.id !== id));
  }

  return (
    <section className="blog-comments" id="comments">
      <h2>
        Comments <span>({comments.length})</span>
      </h2>

      {comments.length === 0 ? (
        <p className="blog-comments-empty">No comments yet — start the conversation.</p>
      ) : (
        <ul className="blog-comment-list">
          {comments.map((c) => (
            <li key={c.id} className="blog-comment">
              <div className="blog-comment-head">
                <strong>{c.authorName}</strong>
                <span>{new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                {isAdmin ? (
                  <button type="button" className="blog-comment-del" onClick={() => remove(c.id)}>
                    Delete
                  </button>
                ) : null}
              </div>
              <p>{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="blog-comment-form">
        {signedIn ? (
          <>
            <textarea
              className="field-input"
              style={{ minHeight: 90 }}
              placeholder="Add a comment…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {error ? <div className="blog-editor-error">{error}</div> : null}
            <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
              {busy ? "Posting…" : "Post comment"}
            </button>
          </>
        ) : (
          <div className="blog-comment-signin">
            <p>Sign in to join the conversation.</p>
            <button type="button" className="btn-primary" onClick={signIn}>
              Sign in with Google
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
