"use client";

import { useState } from "react";

/**
 * Actions on one open report. "Dismiss" clears it from the queue and leaves the
 * content up; hide/delete act on the actual reported item (review or reply) via
 * the existing admin routes.
 */
export default function AdminReportActions({
  reportId,
  reviewId,
  replyId,
  target,
}: {
  reportId: string;
  reviewId: string;
  replyId: string | null;
  target: "review" | "reply";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(request: Promise<Response>, fallback: string) {
    setBusy(true);
    setError("");
    try {
      const res = await request;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || fallback);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : fallback);
      setBusy(false);
    }
  }

  const itemPath = target === "reply" && replyId ? `/api/admin/replies/${replyId}` : `/api/admin/reviews/${reviewId}`;

  function dismiss() {
    if (!confirm("Dismiss this report? It clears the report and leaves the content up.")) return;
    run(
      fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISMISSED" }),
      }),
      "Could not dismiss report.",
    );
  }

  function hide() {
    if (!confirm(`Hide the reported ${target} from the site?`)) return;
    run(
      fetch(itemPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "HIDDEN" }),
      }),
      `Could not hide ${target}.`,
    );
  }

  function remove() {
    if (!confirm(`Delete the reported ${target} permanently? This cannot be undone.`)) return;
    run(fetch(itemPath, { method: "DELETE" }), `Could not delete ${target}.`);
  }

  return (
    <div className="admin-report-actions">
      <button type="button" onClick={dismiss} disabled={busy}>Dismiss</button>
      <button type="button" onClick={hide} disabled={busy}>Hide {target}</button>
      <button type="button" className="admin-danger-link" onClick={remove} disabled={busy}>Delete {target}</button>
      {error ? <span className="admin-report-error">{error}</span> : null}
    </div>
  );
}
