import { useId, useState } from 'preact/hooks';
import { useTimeline } from '../../_shared/useTimeline';
import TimelineControls from '../../_shared/TimelineControls';
import { clamp, lerp } from '../../_shared/anim';
import { buildCdc, stateAt, PT } from './cdcData';

const MS_PER_UNIT = 65;

function Box({ x, y, w, h, title }: { x: number; y: number; w: number; h: number; title: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill="var(--color-bg-card)" stroke="var(--color-border)" stroke-width="1.5" />
      <text x={x + w / 2} y={y + 17} text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--color-heading)">
        {title}
      </text>
    </g>
  );
}

export default function CdcAnimation() {
  const uid = useId();
  const [slow, setSlow] = useState(false);
  const model = buildCdc(slow);
  const tl = useTimeline(model.end * MS_PER_UNIT);
  const vt = tl.t / MS_PER_UNIT;
  const st = stateAt(model, vt);

  const mark = `${uid}-arrow`;
  const staticLine = { stroke: 'var(--color-border)', 'stroke-width': 1.75, fill: 'none' } as const;

  const mono = { fontFamily: "'JetBrains Mono', Consolas, monospace" };
  const label = `Animation of change data capture. A write reaches the database, the change log feeds a consumer, and the consumer invalidates the cache. ${slow ? 'The consumer is slow, so changes queue up and the cache stays wrong for longer.' : ''}`;

  function pick(s: boolean) {
    setSlow(s);
    tl.replay();
  }

  return (
    <figure class="cache-flow not-prose" ref={tl.ref} aria-label={label}>
      <div class="cf-controls" role="group" aria-label="Consumer speed">
        <button type="button" class="cf-btn" aria-pressed={!slow} onClick={() => pick(false)}>
          Normal
        </button>
        <button type="button" class="cf-btn" aria-pressed={slow} onClick={() => pick(true)}>
          Slow consumer
        </button>
      </div>

      <div class="cf-scroll">
        <svg viewBox="0 0 520 232" role="img" aria-label={label} style={{ width: '100%', minWidth: '460px', maxWidth: '600px', height: 'auto', display: 'block', margin: '0.5rem auto 0' }}>
          <defs>
            <marker id={mark} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0 0 L8 4 L0 8 z" fill="var(--color-border)" />
            </marker>
          </defs>

          {/* the plumbing, always visible */}
          {[
            [PT.appOut, PT.dbInApp],
            [PT.otherOut, PT.dbInOther],
            [PT.dbBottom, PT.logTop],
            [PT.logRight, PT.consumerLeft],
            [PT.consumerTop, PT.cacheBottom],
            [PT.dbRight, PT.cacheLeft],
          ].map(([a, b], i) => (
            <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} {...staticLine} marker-end={`url(#${mark})`} />
          ))}
          <text x="277" y="81" text-anchor="middle" font-size="9.5" fill="var(--color-text-muted)">
            refill
          </text>

          <Box x={10} y={16} w={96} h={38} title="App" />
          <Box x={10} y={96} w={96} h={38} title="Other service" />
          <Box x={150} y={44} w={104} h={86} title="Database" />
          <Box x={300} y={44} w={96} h={86} title="Cache" />
          <Box x={150} y={168} w={104} h={52} title="Change log" />
          <Box x={300} y={168} w={96} h={52} title="Invalidator" />

          {/* live values */}
          <text x="202" y="84" text-anchor="middle" font-size="11" fill="var(--color-text)" style={mono}>
            user:42
          </text>
          <text x="202" y="105" text-anchor="middle" font-size="12" font-weight="700" fill="var(--color-heading)" style={mono}>
            v{st.dbVer}
          </text>
          <text x="348" y="84" text-anchor="middle" font-size="11" fill="var(--color-text)" style={mono}>
            user:42
          </text>
          <text x="348" y="105" text-anchor="middle" font-size="12" font-weight="700" fill={st.outOfSync ? 'var(--color-warn)' : st.cacheVer === null ? 'var(--color-text-muted)' : 'var(--color-heading)'} style={mono}>
            {st.cacheVer === null ? '(empty)' : `v${st.cacheVer}`}
          </text>

          {/* the queue inside the change log */}
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={160 + i * 22} y="191" width="19" height="20" rx="3" fill={st.queued[i] ? 'var(--color-accent)' : 'none'} fillOpacity={st.queued[i] ? 0.3 : 0} stroke="var(--color-border)" stroke-width="1.25" stroke-dasharray={st.queued[i] ? undefined : '2 2'} />
              {st.queued[i] && (
                <text x={169.5 + i * 22} y="205" text-anchor="middle" font-size="9.5" fill="var(--color-heading)" style={mono}>
                  {st.queued[i]}
                </text>
              )}
            </g>
          ))}

          {/* status panel */}
          <text x="412" y="62" font-size="11" fill="var(--color-text-muted)">
            Cache vs database
          </text>
          <rect x="412" y="70" width="100" height="26" rx="13" fill="var(--color-bg-card)" stroke={st.outOfSync ? 'var(--color-warn)' : 'var(--color-border)'} stroke-width="1.5" />
          <text x="462" y="87" text-anchor="middle" font-size="12" font-weight="700" fill={st.outOfSync ? 'var(--color-warn)' : 'var(--color-ok)'}>
            {st.outOfSync ? '✕ out of sync' : '✓ in sync'}
          </text>
          <text x="412" y="124" font-size="11" fill="var(--color-text-muted)">
            Events waiting
          </text>
          <text x="412" y="150" font-size="22" font-weight="700" fill="var(--color-heading)">
            {st.queued.length}
          </text>

          {/* packets in flight */}
          {model.packets.map((pk) => {
            if (vt < pk.t0 || vt >= pk.t1) return null;
            const p = clamp((vt - pk.t0) / (pk.t1 - pk.t0));
            const x = lerp(pk.from[0], pk.to[0], p);
            const y = lerp(pk.from[1], pk.to[1], p);
            return (
              <g key={pk.id}>
                <circle cx={x} cy={y} r="6" fill="var(--color-accent)" stroke="var(--color-bg-secondary)" stroke-width="2" />
                <text x={x} y={y - 11} text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--color-text)">
                  {pk.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <TimelineControls tl={tl} />

      <div class="cf-caption tl-caption" data-tone={tl.atEnd ? 'ok' : ''} aria-live="polite">
        {tl.atEnd
          ? slow
            ? 'Same pipeline, slow consumer. Events queued up in the change log and the cache stayed wrong for much longer. CDC makes invalidation automatic, not instant, so keep a TTL underneath it.'
            : 'Each change reached the cache soon after it hit the database, whichever service made it. In between, readers could still get the old value, which is why CDC is "consistent within seconds" and not instantly.'
          : 'A write lands in the database, flows through the change log to the invalidator, and the cache entry is deleted. Watch the pill turn red while the cache is behind.'}
      </div>
    </figure>
  );
}
