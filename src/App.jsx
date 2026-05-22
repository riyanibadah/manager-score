import { useState, useEffect } from "react";

const NAVY = '#1a1a2e';
const GOLD = '#f0b429';
const KEY = 'rmm_data_v1';

const AVATAR_POOL = [
  { bg: '#e6f1fb', fg: '#185fa5' }, { bg: '#e1f5ee', fg: '#0f6e56' },
  { bg: '#fbeaf0', fg: '#993556' }, { bg: '#eeedfe', fg: '#534ab7' },
  { bg: '#faeeda', fg: '#854f0b' }, { bg: '#eaf3de', fg: '#3b6d11' },
  { bg: '#faece7', fg: '#993c1d' }, { bg: '#fcebeb', fg: '#a32d2d' },
];

function avatarColor(name) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 8;
  return AVATAR_POOL[h];
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}
function scoreInfo(s) {
  if (s >= 4.5) return { bg: '#eaf3de', fg: '#3b6d11', label: 'Awesome' };
  if (s >= 4.0) return { bg: '#eaf3de', fg: '#3b6d11', label: 'Great' };
  if (s >= 3.0) return { bg: '#faeeda', fg: '#854f0b', label: 'Decent' };
  if (s >= 2.0) return { bg: '#fcebeb', fg: '#a32d2d', label: 'Rough' };
  return { bg: '#fcebeb', fg: '#a32d2d', label: 'Avoid' };
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
          style={{ fontSize: size, cursor: 'pointer', color: n <= (hover || value) ? GOLD : '#d1d5db', lineHeight: 1, transition: 'color 0.1s', userSelect: 'none' }}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}>★</span>
      ))}
    </div>
  );
}

function ScoreBadge({ score, large }) {
  const info = scoreInfo(score);
  return (
    <div style={{ background: info.bg, color: info.fg, borderRadius: 8, padding: large ? '12px 16px' : '8px 12px', textAlign: 'center', minWidth: large ? 68 : 54, flexShrink: 0 }}>
      <div style={{ fontSize: large ? 28 : 20, fontWeight: 600, lineHeight: 1 }}>{score.toFixed(1)}</div>
      <div style={{ fontSize: large ? 12 : 10, marginTop: 2 }}>{info.label}</div>
    </div>
  );
}

function TraitPill({ tag, sentiment, onRemove }) {
  const map = {
    positive: { bg: '#eaf3de', fg: '#3b6d11', border: '#c0dd97' },
    negative: { bg: '#fcebeb', fg: '#a32d2d', border: '#f7c1c1' },
    neutral:  { bg: '#faeeda', fg: '#854f0b', border: '#fac775' },
  };
  const c = map[sentiment] || map.neutral;
  return (
    <span style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}`, borderRadius: 99, fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {tag}
      {onRemove && <span onClick={onRemove} style={{ cursor: 'pointer', opacity: 0.6, fontSize: 14, lineHeight: 1 }}>×</span>}
    </span>
  );
}

function Avatar({ name, size = 44 }) {
  const av = avatarColor(name);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: av.bg, color: av.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: size * 0.33, flexShrink: 0 }}>
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
    <div onClick={onClick}
      style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem 1.25rem', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#9ca3af'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          <Avatar name={r0.managerName} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>{r0.managerName}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{r0.managerTitle}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{r0.company}{r0.department ? ` · ${r0.department}` : ''} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <ScoreBadge score={overall} />
      </div>
      {topTraits.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {topTraits.map((t, i) => <TraitPill key={i} tag={t.tag} sentiment={t.sentiment} />)}
        </div>
      )}
      {latest.reviewText && (
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 10, borderLeft: '2px solid #e5e7eb', paddingLeft: 10, fontStyle: 'italic', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          "{latest.reviewText}"
        </div>
      )}
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, display: 'flex', gap: 12 }}>
        <span>👍 {wouldPct}% would work for again</span>
        <span>Last review {new Date(latest.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{review.reviewerRole || 'Anonymous employee'}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {new Date(review.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            {' · '}{review.wouldAgain ? '👍 Would work for again' : '👎 Would not work for again'}
          </div>
        </div>
        <ScoreBadge score={review.overall} />
      </div>
      {review.traits?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {review.traits.map((t, i) => <TraitPill key={i} tag={t.tag} sentiment={t.sentiment} />)}
        </div>
      )}
      {review.reviewText && (
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 10, borderLeft: '2px solid #e5e7eb', paddingLeft: 10, fontStyle: 'italic', lineHeight: 1.6 }}>
          "{review.reviewText}"
        </div>
      )}
      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#6b7280' }}>
        {[['Communication', review.communication], ['Work-life balance', review.worklife], ['Recognition', review.recognition]].map(([l, v]) => (
          <span key={l}>{l}: <span style={{ color: GOLD }}>{'★'.repeat(v)}{'☆'.repeat(5 - v)}</span></span>
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
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, marginBottom: '1.25rem', padding: 0 }}>
        ← Back to search
      </button>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar name={r0.managerName} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 20, color: '#111' }}>{r0.managerName}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{r0.managerTitle}</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>{r0.company}{r0.department ? ` · ${r0.department}` : ''}</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
          </div>
          <ScoreBadge score={overall} large />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginTop: '1.25rem' }}>
          {[['Overall', overall.toFixed(1)], ['Communication', communication.toFixed(1)], ['Work-life', worklife.toFixed(1)], ['Recognition', recognition.toFixed(1)], ['Would work for again', wouldPct + '%']].map(([l, v]) => (
            <div key={l} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>{v}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Reviews ({reviews.length})</div>
        <button onClick={onAddReview} style={{ padding: '8px 16px', borderRadius: 8, background: NAVY, color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
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
  const inp = { padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f9fafb', color: '#111', fontSize: 13 };
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      <input style={{ ...inp, flex: '1 1 120px', minWidth: 100 }} placeholder="Add a tag manually…" value={tag}
        onChange={e => setTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
      <select style={{ ...inp }} value={sentiment} onChange={e => setSentiment(e.target.value)}>
        <option value="positive">Positive</option>
        <option value="neutral">Neutral</option>
        <option value="negative">Negative</option>
      </select>
      <button onClick={submit} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: GOLD, color: NAVY, border: 'none' }}>Add</button>
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

  const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f9fafb', color: '#111', fontSize: 14, fontFamily: 'inherit' };
  const btn = { padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none' };

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

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.5rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>Rate your manager</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ width: 8, height: 8, borderRadius: '50%', background: step >= n ? GOLD : '#e5e7eb', transition: 'background 0.2s' }} />
          ))}
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 22, color: '#9ca3af', marginLeft: 8, lineHeight: 1 }}>×</span>
        </div>
      </div>

      {step === 1 && (
        <div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: '1.25rem' }}>Start with basic info about the manager you're rating.</p>
          {[['managerName', "Manager's full name *", "e.g. Alex Johnson"], ['managerTitle', 'Their job title *', 'e.g. Senior Engineering Manager']].map(([k, l, p]) => (
            <div key={k} style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>{l}</label>
              <input style={inp} placeholder={p} value={form[k]} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
            {[['company', 'Company *', 'e.g. Acme Corp'], ['department', 'Department', 'e.g. Engineering']].map(([k, l, p]) => (
              <div key={k}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>{l}</label>
                <input style={inp} placeholder={p} value={form[k]} onChange={e => set(k, e.target.value)} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>Your role (stays anonymous)</label>
            <input style={inp} placeholder="e.g. Software Engineer II" value={form.reviewerRole} onChange={e => set('reviewerRole', e.target.value)} />
          </div>
          {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <button style={{ ...btn, background: step1Valid ? NAVY : '#e5e7eb', color: step1Valid ? '#fff' : '#9ca3af', width: '100%', marginTop: 4 }}
            onClick={() => { if (!step1Valid) { setError('Please fill in the required fields.'); return; } setError(''); setStep(2); }}>
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: '1.25rem' }}>Rate <strong>{form.managerName}</strong> across a few key areas.</p>
          {[['overall', 'Overall score *'], ['communication', 'Communication *'], ['worklife', 'Work-life balance *'], ['recognition', 'Recognition & growth *']].map(([k, l]) => (
            <div key={k} style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>{l}</label>
              <StarPicker value={form[k]} onChange={v => set(k, v)} />
            </div>
          ))}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8, display: 'block' }}>Would you work for them again? *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['yes', true, '👍 Yes'], ['no', false, '👎 No']].map(([k, v, l]) => (
                <button key={k} style={{ ...btn, flex: 1, background: form.wouldAgain === v ? NAVY : '#f9fafb', color: form.wouldAgain === v ? '#fff' : '#374151', border: '1px solid #d1d5db' }}
                  onClick={() => set('wouldAgain', v)}>{l}</button>
              ))}
            </div>
          </div>
          {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btn, background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', flex: 1 }} onClick={() => { setError(''); setStep(1); }}>← Back</button>
            <button style={{ ...btn, background: step2Valid ? NAVY : '#e5e7eb', color: step2Valid ? '#fff' : '#9ca3af', flex: 2 }}
              onClick={() => { if (!step2Valid) { setError('Please complete all ratings and the "work for again" question.'); return; } setError(''); setStep(3); }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: '1.25rem' }}>Write your review. Be honest — future employees will thank you.</p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>Your review *</label>
            <textarea style={{ ...inp, minHeight: 110, resize: 'vertical' }}
              placeholder="What was it actually like working under them? Specific examples help a lot."
              value={form.reviewText} onChange={e => set('reviewText', e.target.value)} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Trait tags</label>
              <button style={{ ...btn, padding: '5px 12px', fontSize: 12, background: loadingTags ? '#f9fafb' : NAVY, color: loadingTags ? '#9ca3af' : '#fff' }}
                onClick={handleGenerateTags} disabled={loadingTags}>
                {loadingTags ? '✨ Generating…' : '✨ Generate with AI'}
              </button>
            </div>
            {form.traits.length > 0
              ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.traits.map((t, i) => <TraitPill key={i} tag={t.tag} sentiment={t.sentiment} onRemove={() => set('traits', form.traits.filter((_, j) => j !== i))} />)}
                </div>
              : <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No tags yet — generate with AI or add manually below.</div>
            }
            <ManualTagAdder onAdd={(tag, sentiment) => set('traits', [...form.traits, { tag, sentiment }])} />
          </div>
          {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btn, background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', flex: 1 }} onClick={() => { setError(''); setStep(2); }}>← Back</button>
            <button style={{ ...btn, background: NAVY, color: '#fff', flex: 2 }} onClick={handleSubmit}>Submit review</button>
          </div>
        </div>
      )}
    </div>
  );
}

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
      <div>
        <div style={{ background: NAVY, borderRadius: '12px 12px 0 0', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div onClick={() => setView(activeKey ? 'profile' : 'home')} style={{ cursor: 'pointer', fontSize: 20, fontWeight: 600, color: '#fff', letterSpacing: '-0.5px' }}>
            Rate My <span style={{ color: GOLD }}>Manager</span>
          </div>
          <button onClick={() => setView(activeKey ? 'profile' : 'home')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
            ← Cancel
          </button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <SubmitForm initialValues={prefill} onClose={() => setView(activeKey ? 'profile' : 'home')} onSubmit={handleSubmit} />
        </div>
      </div>
    );
  }

  if (view === 'profile' && activeKey && managerMap[activeKey]) {
    return (
      <div>
        <div style={{ background: NAVY, borderRadius: '12px 12px 0 0', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div onClick={() => { setView('home'); setSearch(''); }} style={{ cursor: 'pointer', fontSize: 20, fontWeight: 600, color: '#fff', letterSpacing: '-0.5px' }}>
            Rate My <span style={{ color: GOLD }}>Manager</span>
          </div>
          <button onClick={() => setView('home')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
            ← Back to search
          </button>
        </div>
        <div style={{ padding: '1.25rem' }}>
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
    <div>
      {/* NAV */}
      <div style={{ background: NAVY, borderRadius: '12px 12px 0 0', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: '-0.5px' }}>
          Rate My <span style={{ color: GOLD }}>Manager</span>
        </div>
        <button onClick={() => { setPrefill(null); setView('submit'); }}
          style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 500, fontSize: 13, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
          + Rate a manager
        </button>
      </div>

      {/* HERO */}
      <div style={{ background: NAVY, padding: '2.5rem 1.75rem 2rem', borderBottom: `3px solid ${GOLD}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: GOLD, textTransform: 'uppercase', marginBottom: 14 }}>
          Know before you accept
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1.25, margin: '0 0 14px', letterSpacing: '-0.5px', maxWidth: 480 }}>
          Your manager will make or break your next job.
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 2rem', maxWidth: 440 }}>
          Research shows that people don't quit companies — they quit managers. Read and share honest reviews so no one has to find out the hard way.
        </p>
        <div style={{ position: 'relative', maxWidth: 480 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>🔍</span>
          <input
            style={{ width: '100%', padding: '13px 16px 13px 42px', borderRadius: 10, border: hasTyped ? `1.5px solid ${GOLD}` : '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
            placeholder="Search a manager's name…"
            value={search}
            onChange={e => { setSearch(e.target.value); setFilter('all'); }}
          />
        </div>

        {hasTyped && (
          <div style={{ marginTop: '1rem', maxWidth: 480 }}>

            {/* Teaser rows */}
            {filtered.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''} found
                </div>
                {filtered.map(([key, rs]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, userSelect: 'none' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                        {initials(rs[0].managerName)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{rs[0].managerName}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{rs[0].managerTitle} · {rs[0].company}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 18, filter: 'blur(6px)', color: GOLD, letterSpacing: 2, userSelect: 'none' }}>★★★★</div>
                      <span style={{ fontSize: 14 }}>🔒</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Gate card */}
            <div style={{ background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${GOLD}50`, borderRadius: 12, padding: '1.25rem 1.25rem 1.1rem', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🔒</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#fff', marginBottom: 6, lineHeight: 1.3 }}>
                {filtered.length > 0
                  ? `${filtered.length} review${filtered.length !== 1 ? 's' : ''} found for "${search}"`
                  : `Be the first to review "${search}"`}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: '1.1rem', lineHeight: 1.6 }}>
                {filtered.length > 0
                  ? 'Make a free account and review your manager to unlock all reviews.'
                  : 'Create a free account and review your manager — your review helps others too.'}
              </div>
              <button
                onClick={() => { setPrefill({ managerName: search }); setView('submit'); }}
                style={{ width: '100%', padding: '11px 20px', borderRadius: 8, background: GOLD, color: NAVY, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', marginBottom: 8 }}>
                Create free account →
              </button>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.3 }}>
                Anonymous · Takes 3 minutes · No spam
              </div>
            </div>

          </div>
        )}
      </div>

      {!hasTyped && (
        <>
          <div style={{ padding: '2rem 1.75rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 14 }}>Why it matters</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem' }}>
              {[['🏃', '57%', 'of people have left a job because of their manager'], ['📈', '2×', 'more likely to be engaged at work with a great manager'], ['💬', '70%', 'of team engagement is driven by the manager alone']].map(([icon, stat, copy]) => (
                <div key={stat} style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#111', letterSpacing: '-1px', marginBottom: 6 }}>{stat}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{copy}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '2rem 1.75rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 14 }}>How it works</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[['01', 'Search a name', 'Type the name of any manager — past or present. See how real employees rated them across communication, work-life balance, and career growth.'], ['02', 'Read the reviews', 'Every review includes star ratings, AI-generated trait tags, and written accounts from people who worked under them directly.'], ['03', 'Rate your own manager', 'Anonymous, takes 3 minutes. Your review helps someone else avoid a bad situation — or find a great one.']].map(([num, title, desc]) => (
                <div key={num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: NAVY, color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>{num}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#111', marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '2rem 1.75rem', background: '#f9fafb', borderRadius: '0 0 12px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 8 }}>Had a manager worth talking about?</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: '1.25rem', lineHeight: 1.6 }}>Good or bad — your review gives the next person something invaluable: a heads up.</div>
            <button onClick={() => { setPrefill(null); setView('submit'); }}
              style={{ padding: '11px 28px', borderRadius: 8, background: NAVY, color: '#fff', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              Rate your manager →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
