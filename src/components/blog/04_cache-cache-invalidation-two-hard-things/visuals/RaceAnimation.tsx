import { useId, useState } from 'preact/hooks';
import { useTimeline } from '../../_shared/useTimeline';
import TimelineControls from '../../_shared/TimelineControls';
import { clamp, lerp } from '../../_shared/anim';
import { buildRace, stateAt, T_MAX, READ_DONE, MAX_DELAY, type Variant, type Actor } from './raceData';

const DURATION = 10000; // ms for the whole time axis
const X: Record<Actor, number> = { reader: 70, writer: 200, cache: 340, db: 470 };
const Y = (t: number) => 76 + t * 1.75;
const LIFE_TOP = 70;

const VARIANTS: { id: Variant; label: string }[] = [
  { id: 'race', label: 'The race' },
  { id: 'lease', label: 'With a lease' },
  { id: 'versioned', label: 'With a versioned fill' },
];
const NAMES: Record<Actor, string> = { reader: 'Reader', writer: 'Writer', cache: 'Cache', db: 'Database' };

function Chip({ cx, y, text, warn }: { cx: number; y: number; text: string; warn?: boolean }) {
  return (
    <g>
      <rect x={cx - 62} y={y} width="124" height="24" rx="6" fill="var(--color-bg-card)" stroke={warn ? 'var(--color-warn)' : 'var(--color-border)'} stroke-width="1.5" />
      <text x={cx} y={y + 16} text-anchor="middle" font-size="11" fill={warn ? 'var(--color-warn)' : 'var(--color-text)'} style={{ fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
        {text}
      </text>
    </g>
  );
}

export default function RaceAnimation() {
  const uid = useId();
  const tl = useTimeline(DURATION);
  const [variant, setVariant] = useState<Variant>('race');
  const [delay, setDelay] = useState(36);

  const model = buildRace(variant, delay);
  const vt = (tl.t / DURATION) * T_MAX;
  const st = stateAt(model, vt);
  const heldVer = variant === 'versioned' ? ' (v7)' : '';

  const cacheText =
    st.cache.val === null ? '(empty)' : `email = ${st.cache.val}${st.cache.val === 'old' && variant === 'versioned' ? ' (v7)' : ''}`;
  const cacheWarn = st.cache.val !== null && st.cache.val !== st.db.val;
  const dbText = `email = ${st.db.val}${variant === 'versioned' ? ` (v${st.db.ver})` : ''}`;

  const mAcc = `${uid}-acc`;
  const mMut = `${uid}-mut`;
  const mWarn = `${uid}-warn`;
  const done = tl.atEnd;
  const slowTo = Math.min(vt, model.fillT);
  const gap = model.fillT - READ_DONE;

  function pickVariant(v: Variant) {
    setVariant(v);
    tl.replay();
  }

  const label = `Animation of a reader and a writer racing on the same cache key. ${model.outcome.text}`;

  return (
    <figure class="cache-flow not-prose" ref={tl.ref} aria-label={label}>
      <div class="cf-controls" role="tablist" aria-label="Version of the race">
        {VARIANTS.map((v) => (
          <button type="button" role="tab" class="cf-btn" aria-selected={v.id === variant} onClick={() => pickVariant(v.id)} key={v.id}>
            {v.label}
          </button>
        ))}
      </div>

      <div class="cf-scroll">
        <svg viewBox="0 0 520 282" role="img" aria-label={label} style={{ width: '100%', minWidth: '460px', maxWidth: '600px', height: 'auto', display: 'block', margin: '0.5rem auto 0' }}>
          <defs>
            {[
              [mAcc, 'var(--color-accent)'],
              [mMut, 'var(--color-text-muted)'],
              [mWarn, 'var(--color-warn)'],
            ].map(([id, fill]) => (
              <marker id={id} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse" key={id}>
                <path d="M0 0 L8 4 L0 8 z" fill={fill} />
              </marker>
            ))}
          </defs>

          {/* headers, lifelines and live values */}
          {(Object.keys(X) as Actor[]).map((a) => (
            <g key={a}>
              <rect x={X[a] - 48} y="8" width="96" height="26" rx="6" fill="var(--color-bg-card)" stroke="var(--color-border)" stroke-width="1.5" />
              <text x={X[a]} y="26" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--color-heading)">
                {NAMES[a]}
              </text>
              <line x1={X[a]} x2={X[a]} y1={LIFE_TOP} y2={Y(T_MAX)} stroke="var(--color-border)" stroke-width="1.5" stroke-dasharray="3 4" />
            </g>
          ))}
          <Chip cx={X.cache} y={40} text={cacheText} warn={cacheWarn} />
          <Chip cx={X.db} y={40} text={dbText} />
          {vt >= READ_DONE && <Chip cx={X.reader} y={40} text={`holding: old${heldVer}`} />}

          {/* the sweeping "now" line */}
          <line x1="24" x2="504" y1={Y(vt)} y2={Y(vt)} stroke="var(--color-accent)" stroke-width="1" stroke-dasharray="2 4" opacity="0.55" />
          <polygon points={`8,${Y(vt) - 4} 16,${Y(vt)} 8,${Y(vt) + 4}`} fill="var(--color-accent)" opacity="0.7" />

          {/* the reader being slow */}
          {vt > READ_DONE && (
            <g>
              <line x1={X.reader} x2={X.reader} y1={Y(READ_DONE)} y2={Y(slowTo)} stroke="var(--color-accent)" stroke-width="7" stroke-linecap="round" opacity="0.35" />
              {gap >= 14 && vt >= READ_DONE + 10 && (
                <text x={X.reader + 10} y={(Y(READ_DONE) + Y(slowTo)) / 2 + 4} font-size="10.5" fill="var(--color-text-muted)">
                  reader is slow
                </text>
              )}
            </g>
          )}

          {/* arrows */}
          {model.events.map((ev) => {
            if (vt < ev.t) return null;
            const p = clamp((vt - ev.t) / (ev.arrive - ev.t));
            const x1 = X[ev.from];
            const x2 = X[ev.to];
            const y1 = Y(ev.t);
            const y2 = Y(ev.arrive);
            const hx = lerp(x1, x2, p);
            const hy = lerp(y1, y2, p);
            const inFlight = p < 1;
            const color = ev.rejected ? 'var(--color-warn)' : inFlight ? 'var(--color-accent)' : 'var(--color-text-muted)';
            const mark = ev.rejected ? mWarn : inFlight ? mAcc : mMut;
            const right = x2 > x1;
            return (
              <g key={ev.id}>
                <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} stroke-width={inFlight ? 2.5 : 1.75} marker-end={`url(#${mark})`} stroke-dasharray={ev.id === 'rejected' ? '4 3' : undefined} />
                {p > 0.35 && (
                  <text x={x2 + (right ? -6 : 6)} y={y2 - 6} text-anchor={right ? 'end' : 'start'} font-size="11" fill={ev.rejected ? 'var(--color-warn)' : 'var(--color-text)'}>
                    {ev.label}
                  </text>
                )}
                {ev.tag && vt >= ev.arrive && (
                  <text x={X.cache + 9} y={y2 + 4} font-size="10.5" font-weight="700" fill="var(--color-warn)">
                    {ev.tag}
                  </text>
                )}
                {ev.rejected && ev.id === 'set' && vt >= ev.arrive && (
                  <g stroke="var(--color-warn)" stroke-width="2.5" stroke-linecap="round">
                    <line x1={X.cache - 6} y1={y2 - 6} x2={X.cache + 6} y2={y2 + 6} />
                    <line x1={X.cache + 6} y1={y2 - 6} x2={X.cache - 6} y2={y2 + 6} />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div class="cf-range">
        <label for={`${uid}-delay`}>How slow is the reader?</label>
        <span class="cf-meta">fast</span>
        <input
          id={`${uid}-delay`}
          type="range"
          min="0"
          max={MAX_DELAY}
          step="2"
          value={delay}
          onInput={(e) => setDelay(Number((e.target as HTMLInputElement).value))}
          onChange={() => tl.replay()}
        />
        <span class="cf-meta">slow</span>
      </div>
      <div class="cf-meta">
        {model.fillAfterDelete
          ? "At this speed the reader fills the cache after the writer's delete."
          : "At this speed the reader fills the cache before the writer's delete."}
      </div>

      <TimelineControls tl={tl} />

      <div class="cf-caption tl-caption" data-tone={done ? model.outcome.tone : ''} aria-live="polite">
        {done ? model.outcome.text : 'The reader misses the cache, loads the old email from the database, and then dawdles. Meanwhile the writer updates the database and deletes the cache entry.'}
      </div>
    </figure>
  );
}
