"use client";

import { useState } from "react";

export default function AdminBlogRowActions({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this post and its comments? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    if (res.ok) window.location.reload();
    else setBusy(false);
  }

  return (
    <div className="admin-blog-actions">
      <a className="admin-blog-edit" href={`/admin/blog/${id}`}>Edit</a>
      <button type="button" className="admin-danger-link" onClick={remove} disabled={busy}>
        Delete
      </button>
    </div>
  );
}
