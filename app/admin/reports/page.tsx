import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAdminSession } from "../../../src/lib/admin";
import { getOpenReports } from "../../../src/lib/admin-metrics";
import AdminReportActions from "../../../src/components/AdminReportActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Open Reports",
  robots: { index: false, follow: false },
};

export default async function AdminReportsPage() {
  const session = await getAdminSession(await headers());
  if (!session) notFound();

  const reports = await getOpenReports();

  return (
    <main className="admin-dash">
      <nav className="admin-dash-topbar">
        <a className="brand" href="/">
          Manager<span>Score</span>
          <i />
        </a>
        <div className="admin-dash-topbar-actions">
          <span className="admin-dash-badge">Admin</span>
          <a className="btn-outline-dark" href="/admin">← Dashboard</a>
        </div>
      </nav>

      <header className="admin-dash-head">
        <div>
          <h1>Open reports</h1>
          <p>
            {reports.length} report{reports.length === 1 ? "" : "s"} awaiting review.
          </p>
        </div>
      </header>

      <section className="admin-report-list">
        {reports.length === 0 ? (
          <div className="admin-panel-card">
            <p className="admin-empty">Nothing in the queue — all clear.</p>
          </div>
        ) : (
          reports.map((r) => (
            <article className="admin-panel-card admin-report" key={r.id}>
              <header className="admin-report-head">
                <div>
                  <span className="admin-report-reason">{r.reason}</span>
                  <p className="admin-report-meta">
                    On the {r.target} of <strong>{r.managerName}</strong> · {r.company} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <a className="btn-outline-dark" href={`${r.profilePath}#review-${r.reviewId}`} target="_blank" rel="noreferrer">
                  Open on site ↗
                </a>
              </header>

              <blockquote className="admin-report-quote">{r.content}</blockquote>

              {r.details ? (
                <p className="admin-report-details">
                  <strong>What the reporter said:</strong> {r.details}
                </p>
              ) : null}
              <p className="admin-report-requester">
                Reported by {r.requesterName} &lt;{r.requesterEmail}&gt;
              </p>

              <AdminReportActions reportId={r.id} reviewId={r.reviewId} replyId={r.replyId} target={r.target} />
            </article>
          ))
        )}
      </section>
    </main>
  );
}
