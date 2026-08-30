"use client";

import { useState } from "react";

type AdminProfileControlsProps = {
  manager: {
    id: string;
    name: string;
    title: string;
    department?: string | null;
    company: string;
    linkedinUrl?: string | null;
  };
};

export function AdminProfileControls({ manager }: AdminProfileControlsProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: manager.name,
    title: manager.title || "",
    department: manager.department || "",
    company: manager.company,
    linkedinUrl: manager.linkedinUrl || "",
  });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(merge = false) {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch(`/api/admin/managers/${manager.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merge ? { ...form, merge: true } : form),
      });
      const data = await res.json().catch(() => null);

      // Fixing a typo usually means the corrected profile already exists, so a
      // clash is an offer to combine them rather than a refusal.
      if (res.status === 409 && data?.conflict && !merge) {
        const { name, company, reviewCount } = data.conflict;
        const reviews = `${reviewCount} review${reviewCount === 1 ? "" : "s"}`;
        setBusy(false);
        if (
          confirm(
            `${name} at ${company} already exists with ${reviews}.\n\n` +
              `Merge this profile into it? Reviews here move across, and this ` +
              `duplicate is removed. This cannot be undone.`,
          )
        ) {
          await save(true);
        } else {
          setStatus(data.error);
        }
        return;
      }

      if (!res.ok) throw new Error(data?.error || "Could not update profile.");
      window.location.href = data.profilePath || window.location.pathname;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update profile.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProfile() {
    if (!confirm("Delete this manager profile and all of its reviews? This cannot be undone.")) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch(`/api/admin/managers/${manager.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not delete profile.");
      window.location.href = "/";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not delete profile.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="admin-edit-row">
        <button type="button" className="admin-edit-trigger" onClick={() => setOpen(true)}>
          Edit profile
        </button>
      </div>

      {open && (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => !busy && setOpen(false)}>
          <section
            className="admin-panel admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-profile-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-panel-heading">
              <div>
                <strong id="admin-profile-title">Edit profile</strong>
                <span>Only visible to admins</span>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setOpen(false)} disabled={busy}>
                Close
              </button>
            </div>
            <div className="admin-grid">
              <label>
                Name
                <input value={form.name} onChange={(event) => set("name", event.target.value)} />
              </label>
              <label>
                Company
                <input value={form.company} onChange={(event) => set("company", event.target.value)} />
              </label>
              <label>
                Title
                <input value={form.title} onChange={(event) => set("title", event.target.value)} />
              </label>
              <label>
                Department
                <input value={form.department} onChange={(event) => set("department", event.target.value)} />
              </label>
              <label className="admin-grid-wide">
                LinkedIn URL
                <input value={form.linkedinUrl} onChange={(event) => set("linkedinUrl", event.target.value)} />
              </label>
            </div>
            {status ? <p className="admin-status">{status}</p> : null}
            <div className="admin-actions">
              {/* Wrapped, not passed directly: onClick hands the click event
                  through as the first argument, which would arrive as a truthy
                  `merge` and combine two profiles without ever asking. */}
              <button type="button" onClick={() => save()} disabled={busy}>
                {busy ? "Saving..." : "Save changes"}
              </button>
              <button type="button" className="admin-danger" onClick={deleteProfile} disabled={busy}>
                Delete profile
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function AdminReviewControls({ reviewId, verified = false }: { reviewId: string; verified?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function updateReview(method: "PATCH" | "DELETE") {
    const label = method === "DELETE" ? "delete" : "hide";
    if (!confirm(`${label[0].toUpperCase()}${label.slice(1)} this review?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method,
        headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
        body: method === "PATCH" ? JSON.stringify({ status: "HIDDEN" }) : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Could not ${label} review.`);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${label} review.`);
      setBusy(false);
    }
  }

  async function toggleVerified() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !verified }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not update verification.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update verification.");
      setBusy(false);
    }
  }

  return (
    <div className="admin-review-actions">
      <button type="button" onClick={toggleVerified} disabled={busy}>
        {verified ? "Unverify" : "Mark verified"}
      </button>
      <button type="button" onClick={() => updateReview("PATCH")} disabled={busy}>
        Hide review
      </button>
      <button type="button" className="admin-danger-link" onClick={() => updateReview("DELETE")} disabled={busy}>
        Delete review
      </button>
      {error ? <span>{error}</span> : null}
    </div>
  );
}

export function AdminReplyControls({ replyId }: { replyId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function updateReply(method: "PATCH" | "DELETE") {
    const label = method === "DELETE" ? "delete" : "hide";
    if (!confirm(`${label[0].toUpperCase()}${label.slice(1)} this reply?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/replies/${replyId}`, {
        method,
        headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
        body: method === "PATCH" ? JSON.stringify({ status: "HIDDEN" }) : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Could not ${label} reply.`);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${label} reply.`);
      setBusy(false);
    }
  }

  return (
    <span className="admin-review-actions admin-reply-actions">
      <button type="button" onClick={() => updateReply("PATCH")} disabled={busy}>
        Hide reply
      </button>
      <button type="button" className="admin-danger-link" onClick={() => updateReply("DELETE")} disabled={busy}>
        Delete reply
      </button>
      {error ? <span>{error}</span> : null}
    </span>
  );
}
