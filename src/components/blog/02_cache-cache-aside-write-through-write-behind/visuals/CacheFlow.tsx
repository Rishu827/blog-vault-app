import { useId, useState } from 'preact/hooks';
import {
  STRATEGIES,
  LANE_NODES,
  computeState,
  describeCache,
  describeDb,
  type Lane,
  type Node,
  type StrategyId,
  type Tone,
} from './flowData';

interface Props {
  strategy?: StrategyId;
  scenario?: number;
  // static: server-rendered diagram with every step shown. interactive: step through it.
  mode?: 'static' | 'interactive';
}

const NODES: { id: Node; title: string; x: number }[] = [
  { id: 'app', title: 'Application', x: 10 },
  { id: 'cache', title: 'Cache', x: 200 },
  { id: 'db', title: 'Database', x: 390 },
];
const BOX_W = 120;
const BOX_Y = 50;
const BOX_H = 70;

const LANES: Record<Lane, { d: string; bx: number; by: number }> = {
  appCacheReq: { d: 'M132 74 L198 74', bx: 165, by: 62 },
  cacheAppRes: { d: 'M198 100 L132 100', bx: 165, by: 116 },
  cacheDbReq: { d: 'M322 74 L388 74', bx: 355, by: 62 },
  dbCacheRes: { d: 'M388 100 L322 100', bx: 355, by: 116 },
  appDbReq: { d: 'M50 121 V186 H450 V123', bx: 250, by: 186 },
  dbAppRes: { d: 'M470 123 V206 H30 V123', bx: 250, by: 206 },
};

const TONE_COLOR: Record<Tone, string> = {
  ok: 'var(--color-ok)',
  stale: 'var(--color-warn)',
  dirty: 'var(--color-warn)',
  warn: 'var(--color-warn)',
  empty: 'var(--color-text-muted)',
};

export default function CacheFlow({ strategy = 'cache-aside', scenario = 0, mode = 'static' }: Props) {
  const uid = useId();
  const interactive = mode === 'interactive';

  const startStrategy = Math.max(0, STRATEGIES.findIndex((s) => s.id === strategy));
  const [sIdx, setSIdx] = useState(startStrategy);
  const [cIdx, setCIdx] = useState(scenario);

  const strat = STRATEGIES[sIdx];
  const sc = strat.scenarios[Math.min(cIdx, strat.scenarios.length - 1)];
  const total = sc.steps.length;

  const [stepState, setStep] = useState(0);
  const step = interactive ? Math.min(stepState, total) : total;

  const state = computeState(sc, step);
  const cacheView = describeCache(state, sc);
  const dbView = describeDb(state);
  const current = step > 0 ? sc.steps[step - 1] : null;

  const activeNodes = new Set<Node>();
  if (current?.lane) LANE_NODES[current.lane].forEach((n) => activeNodes.add(n));
  if (current?.crashed) activeNodes.add('cache');

  // Group steps by lane so a lane reused by several steps gets one arrow and one badge.
  const laneSteps = new Map<Lane, number[]>();
  sc.steps.forEach((s, i) => {
    if (!s.lane) return;
    laneSteps.set(s.lane, [...(laneSteps.get(s.lane) ?? []), i + 1]);
  });

  const markAcc = `${uid}-acc`;
  const markMut = `${uid}-mut`;

  function pickStrategy(i: number) {
    setSIdx(i);
    setCIdx(0);
    setStep(0);
  }
  function pickScenario(i: number) {
    setCIdx(i);
    setStep(0);
  }

  const label = `Flow of a request between the application, the cache and the database: ${strat.label}, ${sc.title}.`;

  return (
    <figure class="cache-flow not-prose" aria-label={label}>
      {interactive && (
        <div class="cf-controls" role="tablist" aria-label="Caching strategy">
          {STRATEGIES.map((s, i) => (
            <button
              type="button"
              role="tab"
              class="cf-btn"
              aria-selected={i === sIdx}
              onClick={() => pickStrategy(i)}
              key={s.id}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {interactive && strat.scenarios.length > 1 && (
        <div class="cf-controls" role="group" aria-label="Scenario">
          {strat.scenarios.map((s, i) => (
            <button
              type="button"
              class="cf-btn"
              aria-pressed={i === cIdx}
              onClick={() => pickScenario(i)}
              key={s.title}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      <div class="cf-meta" style={{ marginTop: interactive ? '0.75rem' : '0' }}>
        {strat.label}: {sc.title}. Tracking one product's price (key <code>product:42</code>).
      </div>

      <div class="cf-scroll">
        <svg
          viewBox="0 0 520 226"
          role="img"
          aria-label={label}
          style={{ width: '100%', minWidth: '440px', height: 'auto', display: 'block', marginTop: '0.5rem' }}
        >
          <defs>
            <marker id={markAcc} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0 0 L8 4 L0 8 z" fill="var(--color-accent)" />
            </marker>
            <marker id={markMut} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0 0 L8 4 L0 8 z" fill="var(--color-text-muted)" />
            </marker>
          </defs>

          {/* arrows first, so boxes and badges sit on top */}
          {[...laneSteps.entries()].map(([lane, nums]) => {
            const shown = nums.filter((n) => n <= step);
            const isCurrent = nums.includes(step) && interactive;
            const isFuture = shown.length === 0;
            const useAccent = isCurrent || !interactive;
            const isAsync = nums.some((n) => sc.steps[n - 1].async);
            const g = LANES[lane];
            return (
              <path
                key={lane}
                class="cf-lane"
                d={g.d}
                fill="none"
                stroke={useAccent ? 'var(--color-accent)' : 'var(--color-text-muted)'}
                stroke-width={isCurrent ? 2.75 : 1.75}
                stroke-dasharray={isAsync ? '6 4' : undefined}
                opacity={isFuture ? 0.14 : 1}
                marker-end={`url(#${useAccent ? markAcc : markMut})`}
              />
            );
          })}

          {NODES.map((n) => {
            const active = activeNodes.has(n.id);
            const view = n.id === 'cache' ? cacheView : n.id === 'db' ? dbView : null;
            const cx = n.x + BOX_W / 2;
            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={BOX_Y}
                  width={BOX_W}
                  height={BOX_H}
                  rx="8"
                  fill="var(--color-bg-card)"
                  stroke={active ? 'var(--color-accent)' : 'var(--color-border)'}
                  stroke-width={active ? 2.5 : 1.5}
                />
                <text x={cx} y={72} text-anchor="middle" font-size="13" font-weight="700" fill="var(--color-heading)">
                  {n.title}
                </text>
                {view && (
                  <>
                    <text
                      x={cx}
                      y={93}
                      text-anchor="middle"
                      font-size="14"
                      fill={TONE_COLOR[view.tone]}
                      style={{ fontFamily: "'JetBrains Mono', Consolas, monospace" }}
                    >
                      {view.value}
                    </text>
                    {view.label && (
                      <text x={cx} y={109} text-anchor="middle" font-size="10.5" fill={TONE_COLOR[view.tone]}>
                        {view.label}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}

          {[...laneSteps.entries()].map(([lane, nums]) => {
            const shown = nums.filter((n) => n <= step);
            if (shown.length === 0) return null;
            const g = LANES[lane];
            const text = shown.join(', ');
            const w = 16 + text.length * 6.5;
            const isCurrent = interactive && shown.includes(step);
            return (
              <g key={`${lane}-badge`}>
                <rect
                  x={g.bx - w / 2}
                  y={g.by - 9}
                  width={w}
                  height="18"
                  rx="9"
                  fill={isCurrent ? 'var(--color-accent)' : 'var(--color-bg-card)'}
                  stroke={isCurrent ? 'var(--color-accent)' : 'var(--color-text-muted)'}
                  stroke-width="1"
                />
                <text
                  x={g.bx}
                  y={g.by + 4}
                  text-anchor="middle"
                  font-size="11"
                  font-weight="700"
                  fill={isCurrent ? 'var(--color-bg)' : 'var(--color-text-muted)'}
                >
                  {text}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {interactive ? (
        <>
          <div class="cf-caption" data-tone={current?.tone ?? ''} aria-live="polite">
            {current ? (
              <>
                <strong>
                  Step {step} of {total}.
                </strong>{' '}
                {current.text}
              </>
            ) : (
              <>This is the starting state. Press <strong>Next step</strong> to follow the request.</>
            )}
          </div>
          <div class="cf-controls">
            <button type="button" class="cf-btn" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </button>
            <button
              type="button"
              class="cf-btn cf-btn-primary"
              disabled={step >= total}
              onClick={() => setStep(step + 1)}
            >
              Next step
            </button>
            <button type="button" class="cf-btn" disabled={step === 0} onClick={() => setStep(0)}>
              Reset
            </button>
          </div>
        </>
      ) : (
        <ol class="cf-steps">
          {sc.steps.map((s, i) => (
            <li key={i} data-tone={s.tone ?? ''}>
              {s.text}
              {s.async ? ' (dashed arrow: happens later, in the background)' : ''}
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}
