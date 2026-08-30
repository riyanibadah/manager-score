import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAdminSession } from "../../src/lib/admin";
import { getAdminMetrics } from "../../src/lib/admin-metrics";

// Reads the session, so it can never be statically cached and handed to the
// wrong person.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  // Belt and suspenders: the page 404s for non-admins anyway, but this keeps it
  // out of any index even if that ever regressed.
  robots: { index: false, follow: false },
};

const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct",
  search: "Search",
  social: "Social",
  referral: "Referral",
  internal: "Internal",
};

export default async function AdminPage() {
  // The single gate: no admin session, no page. notFound() returns a 404, so the
  // route's existence isn't even confirmed to a non-admin.
  const session = await getAdminSession(await headers());
  if (!session) notFound();

  const m = await getAdminMetrics();
  const vercelUrl = process.env.VERCEL_ANALYTICS_URL || "https://vercel.com/dashboard";
  const maxSource = Math.max(1, ...m.traffic.bySource.map((s) => s.count));

  return (
    <main className="admin-dash">
      <nav className="admin-dash-topbar">
        <a className="brand" href="/">
          Manager<span>Score</span>
          <i />
        </a>
        <div className="admin-dash-topbar-actions">
          <span className="admin-dash-badge">Admin</span>
          <a className="btn-outline-dark" href="/">← Back to site</a>
        </div>
      </nav>

      <header className="admin-dash-head">
        <h1>Dashboard</h1>
        <p>
          Signed in as {session.user?.email}.
          {m.ok ? "" : " Some metrics failed to load — showing what we could."}
        </p>
      </header>

      <section className="admin-stat-grid">
        <StatCard label="Approved reviews" value={m.reviews.approved} sub={`${m.reviews.last7} in last 7 days`} />
        <StatCard label="Comments" value={m.comments.total} sub={`${m.comments.last7} in last 7 days`} />
        <StatCard
          label="Open reports"
          value={m.reports.open}
          sub={`${m.reports.total} all time`}
          tone={m.reports.open > 0 ? "warn" : undefined}
        />
        <StatCard label="Page views (7d)" value={m.traffic.last7} sub={`${m.traffic.total} all time`} />
      </section>

      <section className="admin-panel-card">
        <div className="admin-panel-head">
          <h2>Traffic &amp; sources</h2>
          <a className="btn-outline-dark" href={vercelUrl} target="_blank" rel="noopener noreferrer">
            Open Vercel Analytics ↗
          </a>
        </div>
        {m.traffic.total === 0 ? (
          <p className="admin-empty">
            No first-party pageviews recorded yet — they start accruing once this is live. Vercel
            Analytics has your full history and sources in the meantime.
          </p>
        ) : (
          <div className="admin-two-col">
            <div>
              <h3>By source</h3>
              <ul className="admin-bar-list">
                {m.traffic.bySource.map((s) => (
                  <li key={s.source}>
                    <span className="admin-bar-label">{SOURCE_LABELS[s.source] || s.source}</span>
                    <span className="admin-bar">
                      <span style={{ width: `${(s.count / maxSource) * 100}%` }} />
                    </span>
                    <strong>{s.count.toLocaleString()}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Top referrers</h3>
              {m.traffic.topReferrers.length ? (
                <ul className="admin-list">
                  {m.traffic.topReferrers.map((r) => (
                    <li key={r.host}>
                      <span>{r.host}</span>
                      <strong>{r.count.toLocaleString()}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-empty">No external referrers recorded yet.</p>
              )}
              <h3>Top pages</h3>
              <ul className="admin-list">
                {m.traffic.topPaths.map((p) => (
                  <li key={p.path}>
                    <span>{p.path}</span>
                    <strong>{p.count.toLocaleString()}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <section className="admin-panel-grid">
        <div className="admin-panel-card">
          <h2>Content</h2>
          <ul className="admin-kv">
            <li><span>Reviews (approved / total)</span><strong>{m.reviews.approved} / {m.reviews.total}</strong></li>
            <li><span>Verified reviews</span><strong>{m.reviews.verified}</strong></li>
            <li><span>Hidden reviews</span><strong>{m.reviews.hidden}</strong></li>
            <li><span>New reviews (7d / 30d)</span><strong>{m.reviews.last7} / {m.reviews.last30}</strong></li>
            <li><span>Comments (total / 7d)</span><strong>{m.comments.total} / {m.comments.last7}</strong></li>
          </ul>
        </div>
        <div className="admin-panel-card">
          <h2>Catalog</h2>
          <ul className="admin-kv">
            <li><span>Managers</span><strong>{m.catalog.managers}</strong></li>
            <li><span>Companies</span><strong>{m.catalog.companies}</strong></li>
            <li><span>Signed-in users</span><strong>{m.catalog.users}</strong></li>
          </ul>
        </div>
        <div className="admin-panel-card">
          <h2>Engagement</h2>
          <ul className="admin-kv">
            <li><span>Likes</span><strong>{m.engagement.likes}</strong></li>
            <li><span>Manager follows</span><strong>{m.engagement.follows}</strong></li>
            <li><span>Reply subscriptions</span><strong>{m.engagement.subscriptions}</strong></li>
          </ul>
        </div>
        <div className="admin-panel-card">
          <h2>Most reviewed</h2>
          {m.topManagers.length ? (
            <ul className="admin-list">
              {m.topManagers.map((t, i) => (
                <li key={i}>
                  <span>{t.name} · {t.company}</span>
                  <strong>{t.count.toLocaleString()}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-empty">No reviews yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "warn";
}) {
  return (
    <div className={`admin-stat${tone === "warn" ? " admin-stat-warn" : ""}`}>
      <span className="admin-stat-value">{value.toLocaleString()}</span>
      <span className="admin-stat-label">{label}</span>
      {sub ? <span className="admin-stat-sub">{sub}</span> : null}
    </div>
  );
}
