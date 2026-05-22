import { useState } from "react";
import './App.css';

const NAVY = '#1a1a2e';
const GOLD = '#f0b429';
const KEY = 'rmm_data_v1';

const AVATAR_POOL = [
  { bg: '#dbeafe', fg: '#1d4ed8' }, { bg: '#dcfce7', fg: '#15803d' },
  { bg: '#fce7f3', fg: '#9d174d' }, { bg: '#ede9fe', fg: '#6d28d9' },
  { bg: '#fef3c7', fg: '#b45309' }, { bg: '#dcfce7', fg: '#166534' },
  { bg: '#ffedd5', fg: '#c2410c' }, { bg: '#fee2e2', fg: '#b91c1c' },
];

function avatarColor(name) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 8;
  return AVATAR_POOL[h];
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}
function scoreInfo(s) {
  if (s >= 4.5) return { bg: '#dcfce7', fg: '#166534', label: 'Excellent' };
  if (s >= 4.0) return { bg: '#dcfce7', fg: '#166534', label: 'Great' };
  if (s >= 3.0) return { bg: '#fef3c7', fg: '#b45309', label: 'Decent' };
  if (s >= 2.0) return { bg: '#fee2e2', fg: '#b91c1c', label: 'Rough' };
  return { bg: '#fee2e2', fg: '#b91c1c', label: 'Avoid' };
}
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function managerKey(r) { return `${r.managerName.trim()}|||${r.company.trim()}`; }

function loadData() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { reviews: [] };
  } catch { return { reviews: [] }; }
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
    <div style={{
      background: info.bg, color: info.fg, borderRadius: 10,
      padding: large ? '14px 18px' : '8px 12px',
      textAlign: 'center', minWidth: large ? 78 : 58, flexShrink: 0,
    }}>
      <div style={{ fontSize: large ? 30 : 20, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px' }}>{score.toFixed(1)}</div>
      <div style={{ fontSize: large ? 11 : 10, marginTop: 4, fontWeight: 600, letterSpacing: 0.3 }}>{info.label}</div>
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
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: av.bg, color: av.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.34, flexShrink: 0, letterSpacing: -0.5,
    }}>
      {initials(name)}
    </div>
  );
}

function ManagerCard({ reviews, onClick }) {
  const r0 = reviews[0];
  const overall = avg(reviews.map(r => r.overall));
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

function ReviewCard({ review }) {
  return (
    <div className="review-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{review.reviewerRole || 'Anonymous employee'}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{new Date(review.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <span style={{ color: '#e2e8f0' }}>·</span>
            <span style={{ color: review.wouldAgain ? '#166534' : '#b91c1c', fontWeight: 500 }}>
              {review.wouldAgain ? '👍 Would work for again' : '👎 Would not work for again'}
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
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 12, paddingLeft: 12, borderLeft: '3px solid #f1f5f9', fontStyle: 'italic', lineHeight: 1.65 }}>
          "{review.reviewText}"
        </div>
      )}

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f8fafc', display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#64748b' }}>
        {[['Communication', review.communication], ['Work-life balance', review.worklife], ['Recognition', review.recognition]].map(([l, v]) => (
          <span key={l}>{l}: <span style={{ color: GOLD, fontWeight: 600 }}>{'★'.repeat(v)}{'☆'.repeat(5 - v)}</span></span>
        ))}
      </div>
    </div>
  );
}

function ProfileView({ reviews, onBack, onAddReview }) {
  const r0 = reviews[0];
  const overall = avg(reviews.map(r => r.overall));
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
          {[
            ['Overall', overall.toFixed(1)],
            ['Communication', communication.toFixed(1)],
            ['Work-life', worklife.toFixed(1)],
            ['Recognition', recognition.toFixed(1)],
            ['Would work for again', wouldPct + '%'],
          ].map(([l, v]) => (
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
        <button onClick={onAddReview} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
          + Add review
        </button>
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

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 14, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
      {message}
    </div>
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
    overall: 0, communication: 0, worklife: 0, recognition: 0,
    wouldAgain: null, reviewText: '', traits: [],
  });
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const step1Valid = form.managerName.trim() && form.managerTitle.trim() && form.company.trim();
  const step2Valid = form.overall && form.communication && form.worklife && form.recognition && form.wouldAgain !== null;

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
    if (!form.reviewText.trim()) { setError('Please write your review.'); return; }
    onSubmit({ ...form, id: Date.now().toString(), date: new Date().toISOString() });
  }

  const stepLabels = ['Manager info', 'Ratings', 'Your review'];

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a', letterSpacing: '-0.3px' }}>Rate your manager</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>{stepLabels[step - 1]} · Step {step} of 3</div>
        </div>
        <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 18, lineHeight: 1, padding: '6px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>×</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(step / 3) * 100}%`, background: GOLD, borderRadius: 4, transition: 'width 0.35s ease' }} />
      </div>

      {step === 1 && (
        <div>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.65 }}>
            Start with basic info about the manager you're rating.
          </p>
          {[['managerName', "Manager's full name *", "e.g. Alex Johnson"], ['managerTitle', 'Their job title *', 'e.g. Senior Engineering Manager']].map(([k, l, p]) => (
            <div key={k} style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>{l}</label>
              <input className="field-input" placeholder={p} value={form[k]} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: '1.25rem' }}>
            {[['company', 'Company *', 'e.g. Acme Corp'], ['department', 'Department', 'e.g. Engineering']].map(([k, l, p]) => (
              <div key={k}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>{l}</label>
                <input className="field-input" placeholder={p} value={form[k]} onChange={e => set(k, e.target.value)} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>
              Your role <span style={{ color: '#94a3b8', fontWeight: 400 }}>(stays anonymous)</span>
            </label>
            <input className="field-input" placeholder="e.g. Software Engineer II" value={form.reviewerRole} onChange={e => set('reviewerRole', e.target.value)} />
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
            Rate <strong style={{ color: '#0f172a' }}>{form.managerName}</strong> across a few key areas.
          </p>
          {[['overall', 'Overall score *'], ['communication', 'Communication *'], ['worklife', 'Work-life balance *'], ['recognition', 'Recognition & growth *']].map(([k, l]) => (
            <div key={k} style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>{l}</label>
              <StarPicker value={form[k]} onChange={v => set(k, v)} />
            </div>
          ))}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10, display: 'block' }}>
              Would you work for them again? *
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[[true, '👍 Yes, definitely'], [false, '👎 No, I wouldn\'t']].map(([v, l]) => (
                <button key={String(v)}
                  style={{ flex: 1, padding: '11px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit', transition: 'all 0.15s',
                    background: form.wouldAgain === v ? NAVY : '#f8fafc',
                    color: form.wouldAgain === v ? '#fff' : '#374151',
                    borderColor: form.wouldAgain === v ? NAVY : '#e5e7eb',
                  }}
                  onClick={() => set('wouldAgain', v)}>{l}</button>
              ))}
            </div>
          </div>
          <ErrorBox message={error} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => { setError(''); setStep(1); }}>← Back</button>
            <button className="btn-primary" style={{ flex: 2, padding: '12px' }}
              onClick={() => { if (!step2Valid) { setError('Please complete all ratings and the "work for again" question.'); return; } setError(''); setStep(3); }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.65 }}>
            Write your review. Be honest — future employees will thank you.
          </p>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Your review *</label>
            <textarea className="field-input" style={{ minHeight: 120, resize: 'vertical' }}
              placeholder="What was it actually like working under them? Specific examples help a lot."
              value={form.reviewText} onChange={e => set('reviewText', e.target.value)} />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Trait tags</label>
              <button
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: loadingTags ? '#f8fafc' : NAVY,
                  color: loadingTags ? '#94a3b8' : '#fff',
                  borderColor: loadingTags ? '#e5e7eb' : NAVY,
                }}
                onClick={handleGenerateTags} disabled={loadingTags}>
                {loadingTags ? '✨ Generating…' : '✨ Generate with AI'}
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
            <button className="btn-gold" style={{ flex: 2, padding: '12px', borderRadius: 8 }} onClick={handleSubmit}>
              Submit review →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Nav({ onLogoClick, rightContent }) {
  return (
    <nav style={{ background: NAVY, position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1.5rem', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={onLogoClick} style={{ cursor: 'pointer', userSelect: 'none' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>
            Rate My <span style={{ color: GOLD }}>Manager</span>
          </span>
        </div>
        {rightContent}
      </div>
    </nav>
  );
}

const CONTENT = { maxWidth: 720, margin: '0 auto', padding: '0 1.5rem' };

export default function App() {
  const [reviews, setReviews] = useState(() => loadData().reviews || []);
  const [view, setView] = useState('home');
  const [activeKey, setActiveKey] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  function handleSubmit(review) {
    const next = [...reviews, review];
    setReviews(next);
    saveData({ reviews: next });
    setActiveKey(managerKey(review));
    setView('profile');
  }

  const managerMap = {};
  for (const r of reviews) {
    const k = managerKey(r);
    if (!managerMap[k]) managerMap[k] = [];
    managerMap[k].push(r);
  }

  const filtered = Object.entries(managerMap).filter(([, rs]) => {
    const r0 = rs[0];
    const q = search.toLowerCase();
    if (q && !r0.managerName.toLowerCase().includes(q) && !r0.company.toLowerCase().includes(q) && !(r0.department || '').toLowerCase().includes(q)) return false;
    const s = avg(rs.map(r => r.overall));
    if (filter === 'great' && s < 4) return false;
    if (filter === 'ok' && (s < 2.5 || s >= 4)) return false;
    if (filter === 'bad' && s >= 2.5) return false;
    if (filter === 'wouldagain' && (rs.filter(r => r.wouldAgain).length / rs.length) < 0.5) return false;
    return true;
  });

  const hasTyped = search.trim().length > 0;

  if (view === 'submit') {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
        <Nav
          onLogoClick={() => setView(activeKey ? 'profile' : 'home')}
          rightContent={
            <button className="btn-ghost" style={{ padding: '7px 14px' }} onClick={() => setView(activeKey ? 'profile' : 'home')}>
              ← Cancel
            </button>
          }
        />
        <div style={{ ...CONTENT, paddingTop: '2rem', paddingBottom: '3rem' }}>
          <SubmitForm
            initialValues={prefill}
            onClose={() => setView(activeKey ? 'profile' : 'home')}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    );
  }

  if (view === 'profile' && activeKey && managerMap[activeKey]) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
        <Nav
          onLogoClick={() => { setView('home'); setSearch(''); }}
          rightContent={
            <button className="btn-ghost" style={{ padding: '7px 14px' }} onClick={() => setView('home')}>
              ← All managers
            </button>
          }
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

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <Nav
        onLogoClick={() => {}}
        rightContent={
          <button className="btn-gold" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 8 }}
            onClick={() => { setPrefill(null); setView('submit'); }}>
            + Rate a manager
          </button>
        }
      />

      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg, #0f172a 0%, #1a1a2e 100%)` }}>
        <div style={{ ...CONTENT, paddingTop: '4rem', paddingBottom: hasTyped ? '1.5rem' : '4rem' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, textTransform: 'uppercase', marginBottom: 18 }}>
            Know before you accept
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '0 0 16px', letterSpacing: '-1px', maxWidth: 520 }}>
            Your manager will make or break your next job.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.52)', lineHeight: 1.8, margin: '0 0 2.25rem', maxWidth: 430 }}>
            People don't quit companies — they quit managers. Read and share honest, anonymous reviews so no one has to find out the hard way.
          </p>

          <div style={{ position: 'relative', maxWidth: 520 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none', zIndex: 1 }}>🔍</span>
            <input
              className="hero-input"
              placeholder="Search a manager's name or company…"
              value={search}
              onChange={e => { setSearch(e.target.value); setFilter('all'); }}
            />
          </div>
        </div>

        {/* Search results */}
        {hasTyped && (
          <div style={{ ...CONTENT, paddingBottom: '2rem' }}>
            {filtered.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''} found
                </div>
                {filtered.map(([key, rs]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
                        {initials(rs[0].managerName)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{rs[0].managerName}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{rs[0].managerTitle} · {rs[0].company}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 16, filter: 'blur(5px)', color: GOLD, letterSpacing: 3, userSelect: 'none' }}>★★★★</div>
                      <span style={{ fontSize: 14 }}>🔒</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Gate card */}
            <div style={{ background: 'rgba(255,255,255,0.06)', border: `1.5px solid rgba(240,180,41,0.28)`, borderRadius: 14, padding: '1.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔒</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#fff', marginBottom: 8, lineHeight: 1.35 }}>
                {filtered.length > 0
                  ? `${filtered.length} review${filtered.length !== 1 ? 's' : ''} found for "${search}"`
                  : `Be the first to review "${search}"`}
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', marginBottom: '1.5rem', lineHeight: 1.65, maxWidth: 340, margin: '0 auto 1.5rem' }}>
                {filtered.length > 0
                  ? 'Review your own manager to unlock full access to all reviews.'
                  : 'Create a free account and review your manager — your review helps others too.'}
              </p>
              <button
                onClick={() => { setPrefill({ managerName: search }); setView('submit'); }}
                className="btn-gold"
                style={{ padding: '13px 24px', fontSize: 14, borderRadius: 10, width: '100%', maxWidth: 360 }}>
                Create free account →
              </button>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 12, letterSpacing: 0.3 }}>
                Anonymous · Takes 3 minutes · No spam
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Marketing sections — only when not actively searching */}
      {!hasTyped && (
        <>
          {/* Stats */}
          <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ ...CONTENT, paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
              <div className="section-label">Why it matters</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem' }}>
                {[
                  ['🏃', '57%', 'of people have left a job because of their manager'],
                  ['📈', '2×', 'more likely to be engaged at work with a great manager'],
                  ['💬', '70%', 'of team engagement is driven by the manager alone'],
                ].map(([icon, stat, copy]) => (
                  <div key={stat} style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                    <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                    <div style={{ fontSize: 34, fontWeight: 800, color: '#0f172a', letterSpacing: '-2px', marginBottom: 8 }}>{stat}</div>
                    <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{copy}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* How it works */}
          <div style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ ...CONTENT, paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
              <div className="section-label">How it works</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {[
                  ['01', 'Search a name', 'Type the name of any manager — past or present. See how real employees rated them across communication, work-life balance, and career growth.'],
                  ['02', 'Read the reviews', 'Every review includes star ratings, AI-generated trait tags, and written accounts from people who worked under them directly.'],
                  ['03', 'Rate your own manager', 'Anonymous, takes 3 minutes. Your review helps someone else avoid a bad situation — or find a great one.'],
                ].map(([num, title, desc]) => (
                  <div key={num} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: NAVY, color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 2, letterSpacing: 0.5 }}>
                      {num}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 6 }}>{title}</div>
                      <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ background: '#fff' }}>
            <div style={{ ...CONTENT, paddingTop: '4rem', paddingBottom: '5rem', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 12, letterSpacing: '-0.5px', lineHeight: 1.3 }}>
                Had a manager worth talking about?
              </div>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.75, maxWidth: 380, margin: '0 auto 1.75rem' }}>
                Good or bad — your review gives the next person something invaluable: a heads up.
              </p>
              <button onClick={() => { setPrefill(null); setView('submit'); }}
                className="btn-primary"
                style={{ padding: '14px 36px', fontSize: 15, borderRadius: 10 }}>
                Rate your manager →
              </button>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 14 }}>100% anonymous · Takes 3 minutes</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
