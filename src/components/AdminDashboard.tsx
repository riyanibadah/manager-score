"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AdminMetrics } from "../lib/admin-metrics";

const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct",
  search: "Search",
  social: "Social",
  referral: "Referral",
  internal: "Internal",
};

// Validated categorical slots (blue, orange) for the two-series chart; brand
// purple for the single-series views chart. See the dataviz palette.
const C_REVIEWS = "#2a78d6";
const C_COMMENTS = "#eb6834";
const C_VIEWS = "#5b2df5";

export default function AdminDashboard({
  metrics,
  email,
  vercelUrl,
}: {
  metrics: AdminMetrics;
  email: string;
  vercelUrl: string;
}) {
  const m = metrics;
  const labels = m.series.map((d) => d.date);
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
          Signed in as {email}.{m.ok ? "" : " Some metrics failed to load — showing what we could."}
        </p>
      </header>

      <section className="admin-stat-grid">
        <StatCard icon={<IconStar />} label="Approved reviews" value={m.reviews.approved} sub={`${m.reviews.last7} in last 7 days`} accent={C_REVIEWS} />
        <StatCard icon={<IconChat />} label="Comments" value={m.comments.total} sub={`${m.comments.last7} in last 7 days`} accent={C_COMMENTS} />
        <StatCard icon={<IconFlag />} label="Open reports" value={m.reports.open} sub={`${m.reports.total} all time`} tone={m.reports.open > 0 ? "warn" : undefined} accent="#d03b3b" />
        <StatCard icon={<IconEye />} label="Page views (7d)" value={m.traffic.last7} sub={`${m.traffic.total} all time`} accent={C_VIEWS} />
      </section>

      <section className="admin-chart-grid">
        <div className="admin-panel-card">
          <TrendChart
            title="Reviews & comments per day"
            labels={labels}
            series={[
              { label: "Reviews", color: C_REVIEWS, values: m.series.map((d) => d.reviews) },
              { label: "Comments", color: C_COMMENTS, values: m.series.map((d) => d.comments) },
            ]}
          />
        </div>
        <div className="admin-panel-card">
          <TrendChart
            title="Page views per day"
            labels={labels}
            series={[{ label: "Views", color: C_VIEWS, values: m.series.map((d) => d.views) }]}
          />
        </div>
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
  icon,
  label,
  value,
  sub,
  tone,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  sub?: string;
  tone?: "warn";
  accent: string;
}) {
  return (
    <div className={`admin-stat${tone === "warn" ? " admin-stat-warn" : ""}`}>
      <span className="admin-stat-icon" style={{ color: accent, background: `${accent}14` }}>{icon}</span>
      <span className="admin-stat-value"><CountUp value={value} /></span>
      <span className="admin-stat-label">{label}</span>
      {sub ? <span className="admin-stat-sub">{sub}</span> : null}
    </div>
  );
}

/** Eases from 0 to value once on mount; respects reduced-motion. */
function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 700;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{n.toLocaleString()}</>;
}

function niceCeil(v: number) {
  if (v <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / pow;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * pow;
}

function TrendChart({
  title,
  labels,
  series,
  height = 190,
}: {
  title: string;
  labels: string[];
  series: { label: string; color: string; values: number[] }[];
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.max(240, e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = height;
  const padL = 30;
  const padR = 12;
  const padT = 12;
  const padB = 26;
  const n = labels.length;
  const max = niceCeil(Math.max(1, ...series.flatMap((s) => s.values)));
  const x = (i: number) => padL + (n <= 1 ? (w - padL - padR) / 2 : (i * (w - padL - padR)) / (n - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let idx = Math.round(((px - padL) / (w - padL - padR)) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHover(idx);
  }

  const xLabelIdx = n <= 1 ? [0] : [0, Math.floor(n / 2), n - 1];

  return (
    <div className="admin-chart" ref={wrapRef}>
      <div className="admin-chart-head">
        <h3>{title}</h3>
        {series.length > 1 ? (
          <div className="admin-chart-legend">
            {series.map((s) => (
              <span key={s.label}>
                <i style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <svg
        width={w}
        height={H}
        className="admin-chart-svg"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={title}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const gy = padT + (H - padT - padB) * t;
          return <line key={t} x1={padL} x2={w - padR} y1={gy} y2={gy} className="admin-grid" />;
        })}
        <text x={4} y={padT + 4} className="admin-axis">{max}</text>
        <text x={4} y={H - padB} className="admin-axis">0</text>

        {series.map((s) => {
          const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
          return (
            <path key={s.label} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          );
        })}

        {hover !== null ? (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} className="admin-crosshair" />
            {series.map((s) => (
              <circle key={s.label} cx={x(hover)} cy={y(s.values[hover])} r={3.5} fill={s.color} stroke="#fff" strokeWidth={1.5} />
            ))}
          </>
        ) : null}

        {xLabelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            className="admin-axis"
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
          >
            {labels[i]}
          </text>
        ))}
      </svg>

      {hover !== null ? (
        <div
          className="admin-chart-tip"
          style={{ left: `${(x(hover) / w) * 100}%` }}
        >
          <div className="admin-chart-tip-date">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.label} className="admin-chart-tip-row">
              <i style={{ background: s.color }} />
              <span>{s.label}</span>
              <strong>{s.values[hover].toLocaleString()}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function IconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" />
    </svg>
  );
}
function IconFlag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21V4m0 1 6-1c2 0 3 1 5 1h5l-2 6 2 6h-5c-2 0-3-1-5-1l-6 1" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
