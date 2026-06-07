"use client";

import { useEffect, useState } from "react";

const NAVY = '#080b1a';
const PURPLE = '#5b2df5';
const GOLD = '#ff9f0a';
const KEY = 'rmm_data_v1';
const UNLOCK_KEY = 'rmm_unlocked_v1';

const SAMPLE_REVIEWS = [
  {
    id: 'sample-1',
    managerName: 'David Kim',
    managerTitle: 'Engineering Manager',
    company: 'Apple',
    department: 'Platform',
    reviewerRole: 'Software Engineer',
    overall: 4.6,
    communication: 5,
    worklife: 4,
    recognition: 5,
    wouldAgain: true,
    reviewText: 'David is an excellent leader who trusts his team and provides clear direction. He cares about our growth and career development.',
    traits: [
      { tag: 'Supportive', sentiment: 'positive' },
      { tag: 'Clear communicator', sentiment: 'positive' },
      { tag: 'Hires great people', sentiment: 'positive' },
    ],
    date: '2024-05-12T14:00:00.000Z',
  },
  {
    id: 'sample-2',
    managerName: 'Sarah Johnson',
    managerTitle: 'Product Manager',
    company: 'Google',
    department: 'Search',
    reviewerRole: 'Product Designer',
    overall: 4.2,
    communication: 4,
    worklife: 4,
    recognition: 4,
    wouldAgain: true,
    reviewText: 'Sarah is supportive and encourages new ideas. Sometimes too many meetings, but overall a positive experience.',
    traits: [
      { tag: 'Encouraging', sentiment: 'positive' },
      { tag: 'Open feedback', sentiment: 'positive' },
      { tag: 'Low ego', sentiment: 'positive' },
    ],
    date: '2024-05-10T19:00:00.000Z',
  },
  {
    id: 'sample-3',
    managerName: 'Michael Chen',
    managerTitle: 'Senior Manager',
    company: 'Microsoft',
    department: 'Cloud',
    reviewerRole: 'Senior Engineer',
    overall: 4.5,
    communication: 4,
    worklife: 5,
    recognition: 4,
    wouldAgain: true,
    reviewText: "Michael leads by example and helps the team remove blockers. One of the best managers I've worked with.",
    traits: [
      { tag: 'Develops team', sentiment: 'positive' },
      { tag: 'Leads by example', sentiment: 'positive' },
      { tag: 'Fair', sentiment: 'positive' },
    ],
    date: '2024-05-09T16:00:00.000Z',
  },
  {
    id: 'sample-4',
    managerName: 'Priya Patel',
    managerTitle: 'Engineering Manager',
    company: 'Amazon',
    department: 'Retail',
    reviewerRole: 'Data Engineer',
    overall: 3.1,
    communication: 3,
    worklife: 2,
    recognition: 3,
    wouldAgain: false,
    reviewText: 'Priya is knowledgeable and helpful, but can improve communication and feedback.',
    traits: [
      { tag: 'Micromanages', sentiment: 'neutral' },
      { tag: 'Slow feedback', sentiment: 'neutral' },
      { tag: 'High meetings', sentiment: 'neutral' },
    ],
    date: '2024-05-08T16:00:00.000Z',
  },
];

const AVATAR_POOL = [
  { bg: '#dbeafe', fg: '#1d4ed8' }, { bg: '#dcfce7', fg: '#15803d' },
  { bg: '#fce7f3', fg: '#9d174d' }, { bg: '#ede9fe', fg: '#6d28d9' },
  { bg: '#fef3c7', fg: '#b45309' }, { bg: '#dcfce7', fg: '#166534' },
  { bg: '#ffedd5', fg: '#c2410c' }, { bg: '#fee2e2', fg: '#b91c1c' },
];

const POSITIVE_TAGS = [
  'Supportive',
  'Clear communicator',
  'Fair',
  'Gives feedback',
  'Develops people',
  'Protects team',
  'Low ego',
  'Good priorities',
];

const NEGATIVE_TAGS = [
  'Micromanages',
  'Poor communication',
  'Plays favorites',
  'Takes credit',
  'Blames team',
  'Unclear priorities',
  'Too many meetings',
  'High pressure',
];

function avatarColor(name) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 8;
  return AVATAR_POOL[h];
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}
function scoreInfo(s) {
  if (s >= 4.5) return { bg: '#dcfce7', fg: '#059669', label: 'Great manager' };
  if (s >= 4.0) return { bg: '#dcfce7', fg: '#059669', label: 'Very good manager' };
  if (s >= 3.0) return { bg: '#ffedd5', fg: '#f97316', label: 'Average manager' };
  if (s >= 2.0) return { bg: '#fee2e2', fg: '#b91c1c', label: 'Rough' };
  return { bg: '#fee2e2', fg: '#b91c1c', label: 'Avoid' };
}
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function calculatedOverall(review) {
  const ratings = [review.communication, review.recognition, review.worklife].map(Number).filter(Boolean);
  return ratings.length ? avg(ratings) : Number(review.overall) || 0;
}
function clientSlugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
function profilePathForReview(review) {
  return review.profilePath || `/managers/${review.companySlug || clientSlugify(review.company)}/${review.managerSlug || clientSlugify(review.managerName)}`;
}
function managerKey(r) { return `${r.managerName.trim()}|||${r.company.trim()}`; }

function loadData() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : { reviews: [] }; }
  catch { return { reviews: [] }; }
}
function saveData(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { console.error(e); }
}

async function generateTags(reviewText, managerTitle, company) {
  const res = await fetch('/api/generate-tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewText, managerTitle, company }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.tags;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1d1d1f" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.41-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zm3.61-3.25c.84-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.46 2.336-1.275 3.715 1.336.104 2.715-.688 3.562-1.703z" />
    </svg>
  );
}

function AmazonIcon() {
  return (
    <svg width="35" height="35" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <text x="12" y="15.5" textAnchor="middle" fontSize="14" fontWeight="800" fill="#131A22" fontFamily="Arial, Helvetica, sans-serif">a</text>
      <path d="M6 17.6c2.8 1.7 9.2 1.7 12 0" stroke="#FF9900" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M16.7 16.7l1.5.5-.5 1.5" stroke="#FF9900" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BlurredAvatar({ photo }) {
  return (
    <span className="blurred-avatar">
      <i style={{ backgroundImage: `url(${photo})` }} />
    </span>
  );
}

function CompanyMark({ company }) {
  const name = company.toLowerCase();
  if (name.includes('google')) return <GoogleIcon />;
  if (name.includes('microsoft')) {
    return (
      <span className="company-mark microsoft-mark">
        <span /><span /><span /><span />
      </span>
    );
  }
  if (name.includes('apple')) return <AppleIcon />;
  if (name.includes('amazon')) return <AmazonIcon />;
  return <span className="company-mark fallback-mark">{company[0]?.toUpperCase()}</span>;
}

function Icon({ name, size = 22 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    heart: <path d="M20.8 5.6a5.3 5.3 0 0 0-7.5 0L12 6.9l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5l1.3 1.3L12 22l7.5-7.6 1.3-1.3a5.3 5.3 0 0 0 0-7.5Z" />,
    star: <path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    chart: <><path d="M4 19V5" /><path d="M8 19v-7" /><path d="M12 19V9" /><path d="M16 19V4" /><path d="M20 19v-10" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
  };
  return <svg {...common} stroke="currentColor">{paths[name]}</svg>;
}

function StarPicker({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n}
          style={{ fontSize: size, cursor: 'pointer', color: n <= (hover || value) ? GOLD : '#e5e7eb', lineHeight: 1, transition: 'color 0.1s', userSelect: 'none' }}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}>★</span>
      ))}
    </div>
  );
}

function ScoreBadge({ score, large }) {
  const info = scoreInfo(score);
  return (
    <div style={{ color: info.fg, textAlign: large ? 'center' : 'left', flexShrink: 0 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: info.bg, borderRadius: 8, padding: large ? '12px 16px' : '8px 11px' }}>
        <Icon name="star" size={large ? 22 : 18} />
        <span style={{ fontSize: large ? 28 : 18, fontWeight: 800, lineHeight: 1 }}>{score.toFixed(1)}</span>
      </div>
      <div style={{ fontSize: large ? 12 : 13, marginTop: 8, fontWeight: 700 }}>{info.label}</div>
    </div>
  );
}

function TraitPill({ tag, sentiment, onRemove }) {
  const map = {
    positive: { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' },
    negative: { bg: '#fee2e2', fg: '#b91c1c', border: '#fecaca' },
    neutral:  { bg: '#fef3c7', fg: '#b45309', border: '#fde68a' },
  };
  const c = map[sentiment] || map.neutral;
  return (
    <span style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}`, borderRadius: 20, fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
      {tag}
      {onRemove && <span onClick={onRemove} style={{ cursor: 'pointer', opacity: 0.5, fontSize: 15, lineHeight: 1 }}>×</span>}
    </span>
  );
}

function Avatar({ name, size = 44 }) {
  const av = avatarColor(name);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: av.bg, color: av.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.34, flexShrink: 0, letterSpacing: -0.5 }}>
      {initials(name)}
    </div>
  );
}

function ManagerCard({ reviews, onClick }) {
  const r0 = reviews[0];
  const overall = avg(reviews.map(calculatedOverall));
  const wouldPct = Math.round((reviews.filter(r => r.wouldAgain).length / reviews.length) * 100);
  const allTraits = reviews.flatMap(r => r.traits || []);
  const seen = new Set(); const topTraits = [];
  for (const t of allTraits) { if (!seen.has(t.tag)) { seen.add(t.tag); topTraits.push(t); if (topTraits.length >= 4) break; } }
  const latest = reviews.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);

  return (
    <div onClick={onClick} className="manager-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          <Avatar name={r0.managerName} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{r0.managerName}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{r0.managerTitle}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {r0.company}{r0.department ? ` · ${r0.department}` : ''} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <ScoreBadge score={overall} />
      </div>
      {topTraits.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {topTraits.map((t, i) => <TraitPill key={i} tag={t.tag} sentiment={t.sentiment} />)}
        </div>
      )}
      {latest.reviewText && (
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 12, paddingLeft: 12, borderLeft: '3px solid #f1f5f9', fontStyle: 'italic', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          "{latest.reviewText}"
        </div>
      )}
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f8fafc', display: 'flex', gap: 16 }}>
        <span>👍 {wouldPct}% would work for again</span>
        <span>Updated {new Date(latest.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

function ReviewRow({ review, onClick, href }) {
  const content = (
    <>
      <div className="review-person">
        <Avatar name={review.managerName} size={74} />
        <div className="review-person-copy">
          <div className="review-name">{review.managerName}</div>
          <div className="review-title">{review.managerTitle}</div>
          <div className="review-company">
            <CompanyMark company={review.company} />
            <span>{review.company}</span>
          </div>
        </div>
      </div>
      <div className="review-score-cell">
        <ScoreBadge score={calculatedOverall(review)} />
        <div className="row-tags">
          {review.traits?.slice(0, 3).map((t, i) => <TraitPill key={i} tag={t.tag} sentiment={t.sentiment} />)}
        </div>
      </div>
      <div className="review-copy-cell">
        <p>{review.reviewText}</p>
        <div className="review-meta">
          <span>{review.id.startsWith('sample') ? ['2h ago', '5h ago', '1d ago', '2d ago'][Number(review.id.split('-')[1]) - 1] : 'Just now'}</span>
          <span>{new Date(review.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>
      <span className="row-chevron"><Icon name="chevron" size={27} /></span>
    </>
  );

  if (href) {
    return (
      <a className="home-review-row" href={href}>
        {content}
      </a>
    );
  }

  return (
    <button className="home-review-row" onClick={onClick}>
      {content}
    </button>
  );
}

function ReviewCard({ review }) {
  return (
    <div className="review-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{review.reviewerRole || 'Anonymous employee'}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{new Date(review.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            {[review.employeeStatus, review.employmentType, review.workedWith].filter(Boolean).map(item => (
              <span key={item} style={{ display: 'inline-flex', gap: 8 }}>
                <span style={{ color: '#e2e8f0' }}>·</span>
                <span>{item}</span>
              </span>
            ))}
            <span style={{ color: '#e2e8f0' }}>·</span>
            <span style={{ color: review.wouldAgain ? '#059669' : '#b91c1c', fontWeight: 600 }}>
              {review.wouldAgain ? 'Would work for again' : 'Would not work for again'}
            </span>
          </div>
        </div>
        <ScoreBadge score={review.overall} />
      </div>
      {review.traits?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {review.traits.map((t, i) => <TraitPill key={i} tag={t.tag} sentiment={t.sentiment} />)}
        </div>
      )}
      {review.reviewText && (
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 12, paddingLeft: 12, borderLeft: '3px solid #f1f5f9', lineHeight: 1.65 }}>
          "{review.reviewText}"
        </div>
      )}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f8fafc', display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#64748b' }}>
        {[['Communication', review.communication], ['Work-life balance', review.worklife], ['Recognition', review.recognition]].map(([l, v]) => (
          <span key={l}>{l}: <span style={{ color: PURPLE, fontWeight: 700 }}>{'★'.repeat(Math.round(v))}{'☆'.repeat(5 - Math.round(v))}</span></span>
        ))}
      </div>
    </div>
  );
}

function ProfileView({ reviews, onBack, onAddReview }) {
  const r0 = reviews[0];
  const overall = avg(reviews.map(calculatedOverall));
  const communication = avg(reviews.map(r => r.communication));
  const worklife = avg(reviews.map(r => r.worklife));
  const recognition = avg(reviews.map(r => r.recognition));
  const wouldPct = Math.round((reviews.filter(r => r.wouldAgain).length / reviews.length) * 100);

  return (
    <div>
      <button onClick={onBack} className="back-link">← Back to search</button>
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.75rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar name={r0.managerName} size={64} />
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: '#0f172a', letterSpacing: '-0.5px' }}>{r0.managerName}</div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{r0.managerTitle}</div>
            <div style={{ fontSize: 14, color: '#64748b' }}>{r0.company}{r0.department ? ` · ${r0.department}` : ''}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
          </div>
          <ScoreBadge score={overall} large />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10, marginTop: '1.5rem' }}>
          {[['Overall', overall.toFixed(1)], ['Communication', communication.toFixed(1)], ['Work-life', worklife.toFixed(1)], ['Recognition', recognition.toFixed(1)], ['Would again', wouldPct + '%']].map(([l, v]) => (
            <div key={l} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>{v}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.35 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
          Reviews <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14 }}>({reviews.length})</span>
        </div>
        <button onClick={onAddReview} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>+ Add review</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[...reviews].reverse().map(r => <ReviewCard key={r.id} review={r} />)}
      </div>
    </div>
  );
}

function ManualTagAdder({ onAdd }) {
  const [tag, setTag] = useState('');
  const [sentiment, setSentiment] = useState('neutral');
  const submit = () => { if (tag.trim()) { onAdd(tag.trim(), sentiment); setTag(''); } };
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      <input className="field-input" style={{ flex: '1 1 120px', minWidth: 100 }}
        placeholder="Add a tag manually…" value={tag}
        onChange={e => setTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
      <select className="field-input" style={{ width: 'auto', flex: '0 0 auto' }} value={sentiment} onChange={e => setSentiment(e.target.value)}>
        <option value="positive">Positive</option>
        <option value="neutral">Neutral</option>
        <option value="negative">Negative</option>
      </select>
      <button onClick={submit} className="btn-gold" style={{ padding: '9px 16px', fontSize: 13, borderRadius: 8 }}>Add</button>
    </div>
  );
}

function TagPicker({ selected, onChange }) {
  function toggle(tag, sentiment) {
    const exists = selected.some(t => t.tag === tag);
    if (exists) {
      onChange(selected.filter(t => t.tag !== tag));
    } else {
      onChange([...selected, { tag, sentiment }]);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {[
        ['What helped?', POSITIVE_TAGS, 'positive'],
        ['What hurt?', NEGATIVE_TAGS, 'negative'],
      ].map(([label, tags, sentiment]) => (
        <div key={label}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 10 }}>{label}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map(tag => {
              const active = selected.some(t => t.tag === tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tag-choice ${active ? `tag-choice-${sentiment}` : ''}`}
                  onClick={() => toggle(tag, sentiment)}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 14, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>{message}</div>
  );
}

function SubmitForm({ initialValues, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    managerName: initialValues?.managerName || '',
    managerTitle: initialValues?.managerTitle || '',
    company: initialValues?.company || '',
    department: initialValues?.department || '',
    reviewerRole: '',
    workedWith: '',
    employmentType: '',
    employeeStatus: '',
    communication: 0, worklife: 0, recognition: 0,
    wouldAgain: null, reviewText: '', traits: [], safetyConfirmed: false,
  });
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const step1Valid = form.managerName.trim() && form.managerTitle.trim() && form.company.trim();
  const derivedOverall = calculatedOverall(form);
  const step2Valid = form.communication && form.worklife && form.recognition && form.wouldAgain !== null;
  const step3Valid = form.reviewText.trim().length >= 80;

  async function handleGenerateTags() {
    if (!form.reviewText.trim() || form.reviewText.length < 20) { setError('Write at least 20 characters first.'); return; }
    setError(''); setLoadingTags(true);
    try {
      const tags = await generateTags(form.reviewText, form.managerTitle, form.company);
      set('traits', tags);
    } catch { setError('Could not generate tags — add them manually or skip.'); }
    setLoadingTags(false);
  }

  function handleSubmit() {
    if (!step3Valid) { setError('Please write at least 80 characters so the review is useful.'); return; }
    if (!form.safetyConfirmed) { setError('Please confirm the anonymous safety check before submitting.'); return; }
    const { safetyConfirmed, ...review } = form;
    onSubmit({ ...review, overall: derivedOverall, id: Date.now().toString(), date: new Date().toISOString() });
  }

  const stepLabels = ['Manager info', 'Quick ratings', 'Tags & review', 'Context'];

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a', letterSpacing: '-0.3px' }}>Rate your manager</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>{stepLabels[step - 1]} · Step {step} of 4</div>
        </div>
        <button onClick={onClose} className="modal-close" style={{ position: 'static' }}>×</button>
      </div>
      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(step / 4) * 100}%`, background: PURPLE, borderRadius: 4, transition: 'width 0.35s ease' }} />
      </div>

      {step === 1 && (
        <div>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.65 }}>Start with the basics so the review lands on the right manager profile.</p>
          {[['managerName', "Manager's full name *", "e.g. Alex Johnson"], ['managerTitle', 'Their job title *', 'e.g. Senior Engineering Manager']].map(([k, l, p]) => (
            <div key={k} style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>{l}</label>
              <input className="field-input" placeholder={p} value={form[k]} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
          <div className="form-two-col">
            {[['company', 'Company *', 'e.g. Acme Corp'], ['department', 'Team or department', 'e.g. Engineering']].map(([k, l, p]) => (
              <div key={k}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>{l}</label>
                <input className="field-input" placeholder={p} value={form[k]} onChange={e => set(k, e.target.value)} />
              </div>
            ))}
          </div>
          <ErrorBox message={error} />
          <button className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 14 }}
            onClick={() => { if (!step1Valid) { setError('Please fill in the required fields.'); return; } setError(''); setStep(2); }}>
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.65 }}>
            Rate <strong style={{ color: '#0f172a' }}>{form.managerName}</strong> across the areas people care about before joining a team.
          </p>
          {[['communication', 'Communication *'], ['recognition', 'Support & growth *'], ['worklife', 'Work-life balance *']].map(([k, l]) => (
            <div key={k} style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>{l}</label>
              <StarPicker value={form[k]} onChange={v => set(k, v)} />
            </div>
          ))}
          <div style={{ margin: '0 0 1.5rem', padding: '13px 14px', border: '1px solid #e9e3ff', borderRadius: 12, background: '#f7f3ff', color: '#4c1d95', fontSize: 13, fontWeight: 750 }}>
            Overall score will be calculated automatically: {derivedOverall ? derivedOverall.toFixed(1) : 'rate the 3 areas first'}
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10, display: 'block' }}>Would you work for them again? *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[[true, '👍 Yes, definitely'], [false, "👎 No, I wouldn't"]].map(([v, l]) => (
                <button key={String(v)}
                  style={{ flex: 1, padding: '11px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit', transition: 'all 0.15s', background: form.wouldAgain === v ? NAVY : '#f8fafc', color: form.wouldAgain === v ? '#fff' : '#374151', borderColor: form.wouldAgain === v ? NAVY : '#e5e7eb' }}
                  onClick={() => set('wouldAgain', v)}>{l}</button>
              ))}
            </div>
          </div>
          <ErrorBox message={error} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => { setError(''); setStep(1); }}>← Back</button>
            <button className="btn-primary" style={{ flex: 2, padding: '12px' }}
              onClick={() => { if (!step2Valid) { setError('Please complete all ratings.'); return; } setError(''); setStep(3); }}>Continue →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.65 }}>Tap a few tags, then write the useful part. Specific examples help future employees most.</p>
          <div style={{ marginBottom: '1.5rem' }}>
            <TagPicker selected={form.traits} onChange={tags => set('traits', tags)} />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 6, display: 'block' }}>Your review *</label>
            <textarea className="field-input" style={{ minHeight: 120, resize: 'vertical' }}
              placeholder="What was it actually like working with this manager? Mention communication, feedback, growth, workload, or team culture."
              value={form.reviewText} onChange={e => set('reviewText', e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8, fontSize: 12, color: form.reviewText.trim().length >= 80 ? '#059669' : '#94a3b8' }}>
              <span>Minimum 80 characters</span>
              <span>{form.reviewText.trim().length}/80</span>
            </div>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#374151' }}>Optional AI cleanup</label>
              <button
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit', transition: 'all 0.15s', background: loadingTags ? '#f8fafc' : NAVY, color: loadingTags ? '#94a3b8' : '#fff', borderColor: loadingTags ? '#e5e7eb' : NAVY }}
                onClick={handleGenerateTags} disabled={loadingTags}>
                {loadingTags ? 'Generating…' : 'Suggest tags'}
              </button>
            </div>
            {form.traits.length > 0
              ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.traits.map((t, i) => <TraitPill key={i} tag={t.tag} sentiment={t.sentiment} onRemove={() => set('traits', form.traits.filter((_, j) => j !== i))} />)}
                </div>
              : <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>No tags yet — generate with AI or add manually below.</div>
            }
            <ManualTagAdder onAdd={(tag, sentiment) => set('traits', [...form.traits, { tag, sentiment }])} />
          </div>
          <ErrorBox message={error} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => { setError(''); setStep(2); }}>← Back</button>
            <button className="btn-primary" style={{ flex: 2, padding: '12px' }}
              onClick={() => { if (!step3Valid) { setError('Please write at least 80 characters so the review is useful.'); return; } setError(''); setStep(4); }}>Continue →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.65 }}>Add optional context so readers understand the review without identifying you.</p>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Your role <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
            <input className="field-input" placeholder="e.g. Software Engineer II" value={form.reviewerRole} onChange={e => set('reviewerRole', e.target.value)} />
          </div>
          <div className="form-two-col">
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Time worked together</label>
              <select className="field-input" value={form.workedWith} onChange={e => set('workedWith', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="Less than 6 months">Less than 6 months</option>
                <option value="6-12 months">6-12 months</option>
                <option value="1-2 years">1-2 years</option>
                <option value="2+ years">2+ years</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Employment type</label>
              <select className="field-input" value={form.employmentType} onChange={e => set('employmentType', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Intern">Intern</option>
                <option value="Contractor">Contractor</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}>Status</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Current employee', 'Former employee'].map(value => (
                <button key={value} type="button" className={`context-choice ${form.employeeStatus === value ? 'context-choice-active' : ''}`} onClick={() => set('employeeStatus', value)}>
                  {value}
                </button>
              ))}
            </div>
          </div>
          <label className="safety-check">
            <input type="checkbox" checked={form.safetyConfirmed} onChange={e => set('safetyConfirmed', e.target.checked)} />
            <span>Anonymous safety check: I did not include names, private details, or anything that identifies me or coworkers.</span>
          </label>
          <ErrorBox message={error} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => { setError(''); setStep(3); }}>← Back</button>
            <button className="btn-gold" style={{ flex: 2, padding: '12px', borderRadius: 8 }} onClick={handleSubmit}>Submit anonymous review →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchModal({ searchTerm, resultCount, onClose, onWriteReview, onViewMatches }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <button className="modal-close" onClick={onClose}>×</button>

        <div style={{ fontWeight: 800, fontSize: 17, color: NAVY, marginBottom: '1.75rem' }}>
          Manager<span style={{ color: PURPLE }}>Score</span>
        </div>

        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f4f0ff', color: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Icon name="search" size={26} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8, lineHeight: 1.3, letterSpacing: '-0.3px' }}>
            {resultCount > 0
              ? `${resultCount} manager match${resultCount !== 1 ? 'es' : ''} for "${searchTerm}"`
              : `No manager reviews yet for "${searchTerm}"`}
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: 0 }}>
            {resultCount > 0
              ? 'You can open an existing profile or add a fresh anonymous review.'
              : 'Be the first to leave a useful anonymous review. Keep it honest, specific, and work-focused.'}
          </p>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {resultCount > 0 && (
            <button className="btn-outline" style={{ width: '100%', padding: '13px', fontSize: 14 }} onClick={onViewMatches}>
              View matching manager
            </button>
          )}
          <button className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 14, borderRadius: 8 }} onClick={onWriteReview}>
            Write anonymous review →
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          Anonymous · No signup · Takes 3 minutes
        </div>
      </div>
    </div>
  );
}

function SearchLoadingModal({ searchTerm }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ textAlign: 'center', paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
        <div className="search-spinner" />
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '1.5rem 0 6px', letterSpacing: '-0.3px' }}>
          Searching for "{searchTerm}"…
        </h2>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Looking through anonymous manager reviews.</p>
      </div>
    </div>
  );
}

function AuthGateModal({ searchTerm, onClose, onContinue }) {
  const [email, setEmail] = useState('');
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <button className="modal-close" onClick={onClose}>×</button>

        <div style={{ fontWeight: 800, fontSize: 17, color: NAVY, marginBottom: '1.75rem' }}>
          Manager<span style={{ color: PURPLE }}>Score</span>
        </div>

        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f4f0ff', color: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Icon name="lock" size={24} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8, lineHeight: 1.3, letterSpacing: '-0.3px' }}>
            Sign in to see results for "{searchTerm}"
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: 0 }}>
            Quick and free — continue with Google or your email. Your identity is only used to keep reviews trustworthy; everything you post stays completely anonymous.
          </p>
        </div>

        <button className="btn-google" onClick={onContinue}>
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        <input
          className="field-input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && email.trim() && onContinue()}
          style={{ marginBottom: 10 }}
        />
        <button className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 14, borderRadius: 8 }} disabled={!email.trim()} onClick={onContinue}>
          Continue with email →
        </button>

        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          Your reviews stay 100% anonymous · No spam
        </div>
      </div>
    </div>
  );
}

function ReviewGateModal({ searchTerm, onClose, onWriteReview }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <button className="modal-close" onClick={onClose}>×</button>

        <div style={{ fontWeight: 800, fontSize: 17, color: NAVY, marginBottom: '1.75rem' }}>
          Manager<span style={{ color: PURPLE }}>Score</span>
        </div>

        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fef3c7', color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Icon name="edit" size={24} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8, lineHeight: 1.3, letterSpacing: '-0.3px' }}>
            One last step to unlock "{searchTerm}"
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: 0 }}>
            Share one anonymous review of your own manager and we'll unlock every manager profile and review on ManagerScore — including this one.
          </p>
        </div>

        <button className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 14, borderRadius: 8 }} onClick={onWriteReview}>
          Write anonymous review →
        </button>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          Anonymous · Takes 3 minutes · Unlocks instantly
        </div>
      </div>
    </div>
  );
}

function Nav({ onLogoClick, onGetStarted }) {
  return (
    <nav className="rmm-nav">
      <div className="nav-inner">
        <div onClick={onLogoClick} className="brand">
          Manager<span>Score</span><i />
        </div>
        <div className="nav-links">
          <a href="#reviews">Managers</a>
          <button onClick={onGetStarted}>Write a Review</button>
          <a href="#about">About</a>
        </div>
        <div className="nav-actions">
          <button className="nav-signin" onClick={onGetStarted}>Anonymous</button>
          <button className="btn-primary" style={{ padding: '14px 23px', fontSize: 14 }} onClick={onGetStarted}>Write review</button>
        </div>
      </div>
    </nav>
  );
}

function ProfileNav({ onLogoClick, onBack, onAddReview }) {
  return (
    <nav className="rmm-nav">
      <div className="nav-inner">
        <div onClick={onLogoClick} className="brand">Manager<span>Score</span><i /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-outline-dark" style={{ padding: '8px 14px', fontSize: 13 }} onClick={onBack}>← Back</button>
          <button className="btn-primary" style={{ padding: '9px 16px', fontSize: 13 }} onClick={onAddReview}>+ Add review</button>
        </div>
      </div>
    </nav>
  );
}

const CONTENT = { maxWidth: 1160, margin: '0 auto', padding: '0 1.25rem' };

export default function App(props) {
  const { initialReviews = [] } = props || {};
  const [reviews, setReviews] = useState(initialReviews);
  const [view, setView] = useState('home');
  const [activeKey, setActiveKey] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [searchCompany, setSearchCompany] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [searchStage, setSearchStage] = useState(null); // null | 'loading' | 'auth' | 'gate'
  const [unlocked, setUnlocked] = useState(false);
  const [pendingUnlock, setPendingUnlock] = useState(false);
  const allReviews = [...reviews, ...SAMPLE_REVIEWS];

  useEffect(() => {
    setUnlocked(localStorage.getItem(UNLOCK_KEY) === 'true');
    setReviews(loadData().reviews || []);
    fetch('/api/reviews')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.reviews?.length) {
          setReviews(prev => {
            const seen = new Set(prev.map(r => r.id));
            return [...prev, ...data.reviews.filter(r => !seen.has(r.id))];
          });
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(review) {
    const next = [...reviews, review];
    setReviews(next);
    saveData({ reviews: next });
    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    }).catch(() => {});

    if (pendingUnlock) {
      localStorage.setItem(UNLOCK_KEY, 'true');
      setUnlocked(true);
      setPendingUnlock(false);
      setView('home');
      setShowModal(true);
      return;
    }

    setActiveKey(managerKey(review));
    setView('profile');
  }

  const managerMap = {};
  for (const r of allReviews) {
    const k = managerKey(r);
    if (!managerMap[k]) managerMap[k] = [];
    managerMap[k].push(r);
  }

  const qName = searchName.toLowerCase().trim();
  const qCompany = searchCompany.toLowerCase().trim();
  const canSearch = Boolean(qName && qCompany);
  const matchedManagers = canSearch
    ? Object.entries(managerMap).filter(([, rs]) => {
        const r0 = rs[0];
        return r0.managerName.toLowerCase().includes(qName) && r0.company.toLowerCase().includes(qCompany);
      })
    : [];
  const searchTerm = canSearch ? `${searchName.trim()} at ${searchCompany.trim()}` : '';

  function handleSearch() {
    if (!canSearch) return;
    if (unlocked) { setShowModal(true); return; }
    setSearchStage('loading');
    setTimeout(() => setSearchStage('auth'), 1300);
  }

  function handleAuthContinue() {
    setSearchStage('gate');
  }

  function handleWriteReviewToUnlock() {
    setSearchStage(null);
    setPendingUnlock(true);
    setPrefill(null);
    setView('submit');
  }

  function handleWriteReviewFromSearch() {
    setShowModal(false);
    setPrefill(canSearch ? { managerName: searchName.trim(), company: searchCompany.trim() } : null);
    setView('submit');
  }

  function handleViewMatches() {
    if (matchedManagers[0]) {
      setShowModal(false);
      setActiveKey(matchedManagers[0][0]);
      setView('profile');
    }
  }

  if (view === 'submit') {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
        <nav className="rmm-nav">
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div onClick={() => setView(activeKey ? 'profile' : 'home')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: NAVY }}>Manager<span style={{ color: PURPLE }}>Score</span></span>
            </div>
            <button className="btn-outline-dark" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setView(activeKey ? 'profile' : 'home')}>← Cancel</button>
          </div>
        </nav>
        <div style={{ ...CONTENT, paddingTop: '2rem', paddingBottom: '3rem' }}>
          <SubmitForm initialValues={prefill} onClose={() => setView(activeKey ? 'profile' : 'home')} onSubmit={handleSubmit} />
        </div>
      </div>
    );
  }

  if (view === 'profile' && activeKey && managerMap[activeKey]) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
        <ProfileNav
          onLogoClick={() => { setView('home'); setSearchName(''); setSearchCompany(''); }}
          onBack={() => setView('home')}
          onAddReview={() => {
            const r0 = managerMap[activeKey][0];
            setPrefill({ managerName: r0.managerName, managerTitle: r0.managerTitle, company: r0.company, department: r0.department });
            setView('submit');
          }}
        />
        <div style={{ ...CONTENT, paddingTop: '1.75rem', paddingBottom: '3rem' }}>
          <ProfileView
            reviews={managerMap[activeKey]}
            onBack={() => setView('home')}
            onAddReview={() => {
              const r0 = managerMap[activeKey][0];
              setPrefill({ managerName: r0.managerName, managerTitle: r0.managerTitle, company: r0.company, department: r0.department });
              setView('submit');
            }}
          />
        </div>
      </div>
    );
  }

  const recentReviews = [...allReviews]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);

  return (
    <div className="home-shell">
      <Nav onLogoClick={() => {}} onGetStarted={() => { setPrefill(null); setView('submit'); }} />

      {searchStage === 'loading' && <SearchLoadingModal searchTerm={searchTerm} />}

      {searchStage === 'auth' && (
        <AuthGateModal
          searchTerm={searchTerm}
          onClose={() => setSearchStage(null)}
          onContinue={handleAuthContinue}
        />
      )}

      {searchStage === 'gate' && (
        <ReviewGateModal
          searchTerm={searchTerm}
          onClose={() => setSearchStage(null)}
          onWriteReview={handleWriteReviewToUnlock}
        />
      )}

      {showModal && (
        <SearchModal
          searchTerm={searchTerm}
          resultCount={matchedManagers.length}
          onClose={() => setShowModal(false)}
          onWriteReview={handleWriteReviewFromSearch}
          onViewMatches={handleViewMatches}
        />
      )}

      <main>
        <section className="hero-section">
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="privacy-pill">
                <Icon name="users" size={17} />
                <span>Real reviews from real employees. Always <strong>anonymous.</strong></span>
              </div>
              <h1>Know your manager <span>before you join.</span></h1>
              <p>Search managers and see what employees actually think.</p>

              <div className="hero-search-wrap">
                <Icon name="search" size={28} />
                <input
                  className="hero-search-input"
                  placeholder="Manager's name..."
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <span className="hero-search-divider" />
                <input
                  className="hero-search-input"
                  placeholder="Company..."
                  value={searchCompany}
                  onChange={e => setSearchCompany(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button className="hero-search-btn" disabled={!canSearch} onClick={handleSearch}>Search</button>
              </div>

              <div className="trending-searches">
                <span>Trending companies:</span>
                {['Amazon', 'Google', 'TikTok', 'Microsoft', 'Stripe'].map(term => (
                  <button key={term} onClick={() => setSearchCompany(term)}>{term}</button>
                ))}
              </div>

              <div className="review-count">
                <div className="mini-avatars">
                  <BlurredAvatar photo="https://i.pravatar.cc/100?img=12" />
                  <BlurredAvatar photo="https://i.pravatar.cc/100?img=47" />
                  <BlurredAvatar photo="https://i.pravatar.cc/100?img=33" />
                  <BlurredAvatar photo="https://i.pravatar.cc/100?img=5" />
                </div>
                <strong>{(12482 + reviews.length).toLocaleString()} anonymous reviews</strong>
                <span>and counting</span>
              </div>
            </div>

            <div className="hero-proof">
              <div className="proof-card proof-one">
                <Icon name="heart" size={24} />
                <p>"Finally a place to share the truth."</p>
                <span>- Verified Reviewer</span>
              </div>
              <div className="proof-card proof-two">
                <Icon name="star" size={23} />
                <p>"Helped me dodge a toxic manager."</p>
                <span>- Software Engineer</span>
              </div>
              <div className="proof-card proof-three">
                <Icon name="shield" size={23} />
                <p>100% anonymous. Always will be.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="reviews" className="reviews-section">
          <div className="section-head">
            <h2>Recent reviews</h2>
            <button onClick={() => setShowModal(true)}>View all reviews <Icon name="arrow" size={18} /></button>
          </div>
          <div className="recent-list">
            {recentReviews.map(review => (
              <ReviewRow
                key={review.id}
                review={review}
                href={profilePathForReview(review)}
                onClick={() => {
                  setActiveKey(managerKey(review));
                  setView('profile');
                }}
              />
            ))}
          </div>
        </section>

        <section className="review-cta">
          <div className="megaphone">▸</div>
          <div>
            <h2>Your review can help someone make a <span>better decision.</span></h2>
            <p>Share your experience. Help others. Keep it anonymous.</p>
          </div>
          <button onClick={() => { setPrefill(null); setView('submit'); }}>
            <Icon name="edit" size={23} /> Write a review
          </button>
        </section>

        <section id="about" className="trust-grid">
          {[
            ['lock', '100% Anonymous', 'We never reveal your identity.'],
            ['shield', 'No Fake Reviews', 'We verify employees, not accounts.'],
            ['chart', 'Real Insights', 'Unfiltered reviews from real employees.'],
            ['heart', 'Better Workplaces', 'Transparency leads to better teams.'],
          ].map(([icon, title, copy]) => (
            <div className="trust-item" key={title}>
              <span><Icon name={icon} size={28} /></span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer className="site-footer">
        <div className="brand">Manager<span>Score</span></div>
        <nav>
          <a href="#about">About</a>
          <a href="#reviews">Contact</a>
          <a href="#about">Privacy</a>
          <a href="#about">Terms</a>
        </nav>
        <div className="social-links"><span>t</span><span>in</span><span>◎</span></div>
      </footer>
    </div>
  );
}
