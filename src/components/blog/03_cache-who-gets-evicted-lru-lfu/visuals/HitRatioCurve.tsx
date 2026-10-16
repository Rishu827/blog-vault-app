import { useState } from 'preact/hooks';
import { getCurve, PARAMS } from './hitRatioData';

// Hit ratio vs cache size. The points come from a seeded simulation (hitRatioData.ts),
// computed when the page is built, not drawn by hand.
const L = 48; // plot left
const R = 400; // plot right
const T = 20; // plot top (100%)
const B = 250; // plot bottom (0%)
const X_MAX = 50;

const x = (pct: number) => L + (pct / X_MAX) * (R - L);
const y = (v: number) => B - v * (B - T);
const pc = (v: number) => `${Math.round(v * 100)}%`;

const S1 = 'var(--cf-series-1)';
const S2 = 'var(--cf-series-2)';

export default function HitRatioCurve() {
  const curve = getCurve();
  const [hover, setHover] = useState<number | null>(null);

  const zipfPts = [{ pct: 0, v: 0 }, ...curve.map((p) => ({ pct: p.pct, v: p.zipf }))];
  const uniPts = [{ pct: 0, v: 0 }, ...curve.map((p) => ({ pct: p.pct, v: p.uniform }))];
  const path = (pts: { pct: number; v: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.pct)} ${y(p.v)}`).join(' ');

  const label = `Line chart of simulated LRU hit ratio against cache size. With skewed traffic the hit ratio rises quickly, from ${pc(curve[0].zipf)} at a ${curve[0].pct}% cache to ${pc(curve[curve.length - 1].zipf)} at ${curve[curve.length - 1].pct}%. With uniform traffic it only equals the cache fraction.`;

  const hp = hover !== null ? curve[hover] : null;
  const tipW = 158;
  const tipX = hp ? (x(hp.pct) > 270 ? x(hp.pct) - tipW - 12 : x(hp.pct) + 12) : 0;

  return (
    <figure class="cache-flow not-prose" aria-label={label}>
      <div class="hr-legend">
        <span>
          <svg width="26" height="10" aria-hidden="true">
            <line x1="1" y1="5" x2="25" y2="5" stroke={S1} stroke-width="2" stroke-linecap="round" />
            <circle cx="13" cy="5" r="4" fill={S1} stroke="var(--color-bg-secondary)" stroke-width="2" />
          </svg>{' '}
          Skewed traffic (Zipf)
        </span>
        <span>
          <svg width="26" height="10" aria-hidden="true">
            <line x1="1" y1="5" x2="25" y2="5" stroke={S2} stroke-width="2" stroke-linecap="round" stroke-dasharray="5 3" />
            <rect x="9" y="1" width="8" height="8" transform="rotate(45 13 5)" fill={S2} stroke="var(--color-bg-secondary)" stroke-width="2" />
          </svg>{' '}
          Uniform traffic
        </span>
      </div>

      <div class="cf-scroll">
        <svg viewBox="0 0 520 300" role="img" aria-label={label} style={{ width: '100%', minWidth: '440px', height: 'auto', display: 'block' }}>
          {/* grid and axes */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="var(--color-border)" stroke-width="1" opacity={v === 0 ? 1 : 0.6} />
              <text x={L - 8} y={y(v) + 4} text-anchor="end" font-size="11" fill="var(--color-text-muted)">
                {pc(v)}
              </text>
            </g>
          ))}
          {[0, 10, 20, 30, 40, 50].map((p) => (
            <text key={p} x={x(p)} y={B + 18} text-anchor="middle" font-size="11" fill="var(--color-text-muted)">
              {p}%
            </text>
          ))}
          <text x={(L + R) / 2} y={B + 40} text-anchor="middle" font-size="12" fill="var(--color-text-muted)">
            Cache size, as a percentage of all keys
          </text>
          <text x="12" y={(T + B) / 2} text-anchor="middle" font-size="12" fill="var(--color-text-muted)" transform={`rotate(-90 12 ${(T + B) / 2})`}>
            Hit ratio
          </text>

          {/* series */}
          <path d={path(uniPts)} fill="none" stroke={S2} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5 4" />
          <path d={path(zipfPts)} fill="none" stroke={S1} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

          {curve.map((p) => (
            <g key={p.pct}>
              <circle cx={x(p.pct)} cy={y(p.zipf)} r="4" fill={S1} stroke="var(--color-bg-secondary)" stroke-width="2" />
              <rect
                x={x(p.pct) - 4}
                y={y(p.uniform) - 4}
                width="8"
                height="8"
                transform={`rotate(45 ${x(p.pct)} ${y(p.uniform)})`}
                fill={S2}
                stroke="var(--color-bg-secondary)"
                stroke-width="2"
              />
            </g>
          ))}

          {/* direct labels at the line ends */}
          {[
            { v: curve[curve.length - 1].zipf, name: 'Skewed (Zipf)', c: S1, dash: false },
            { v: curve[curve.length - 1].uniform, name: 'Uniform', c: S2, dash: true },
          ].map((s) => (
            <g key={s.name}>
              <line x1={R + 12} x2={R + 26} y1={y(s.v)} y2={y(s.v)} stroke={s.c} stroke-width="2" stroke-linecap="round" stroke-dasharray={s.dash ? '4 3' : undefined} />
              <text x={R + 31} y={y(s.v) + 4} font-size="12" fill="var(--color-text)">
                {s.name}
              </text>
            </g>
          ))}

          {/* hover layer: crosshair, tooltip, and one wide hit area per cache size */}
          {hp && (
            <g pointer-events="none">
              <line x1={x(hp.pct)} x2={x(hp.pct)} y1={T} y2={B} stroke="var(--color-text-muted)" stroke-width="1" />
              <rect x={tipX} y={T + 4} width={tipW} height="70" rx="6" fill="var(--color-bg-card)" stroke="var(--color-border)" />
              <text x={tipX + 10} y={T + 22} font-size="11" fill="var(--color-text-muted)">
                Cache holds {hp.pct}% of keys
              </text>
              <line x1={tipX + 10} x2={tipX + 22} y1={T + 38} y2={T + 38} stroke={S1} stroke-width="2" stroke-linecap="round" />
              <text x={tipX + 28} y={T + 42} font-size="13" font-weight="700" fill="var(--color-heading)">
                {pc(hp.zipf)}
              </text>
              <text x={tipX + 62} y={T + 42} font-size="11" fill="var(--color-text-muted)">
                skewed
              </text>
              <line x1={tipX + 10} x2={tipX + 22} y1={T + 58} y2={T + 58} stroke={S2} stroke-width="2" stroke-linecap="round" stroke-dasharray="4 3" />
              <text x={tipX + 28} y={T + 62} font-size="13" font-weight="700" fill="var(--color-heading)">
                {pc(hp.uniform)}
              </text>
              <text x={tipX + 62} y={T + 62} font-size="11" fill="var(--color-text-muted)">
                uniform
              </text>
            </g>
          )}
          {curve.map((p, i) => {
            const left = i === 0 ? L : (x(curve[i - 1].pct) + x(p.pct)) / 2;
            const right = i === curve.length - 1 ? R + 4 : (x(p.pct) + x(curve[i + 1].pct)) / 2;
            return (
              <rect
                key={p.pct}
                x={left}
                y={T}
                width={right - left}
                height={B - T}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`Cache holds ${p.pct}% of keys. Skewed traffic ${pc(p.zipf)} hit ratio. Uniform traffic ${pc(p.uniform)}.`}
                onPointerMove={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
            );
          })}
        </svg>
      </div>

      <details class="hr-table">
        <summary>View the numbers as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Cache size (% of keys)</th>
              <th scope="col">Skewed (Zipf)</th>
              <th scope="col">Uniform</th>
            </tr>
          </thead>
          <tbody>
            {curve.map((p) => (
              <tr key={p.pct}>
                <th scope="row">{p.pct}%</th>
                <td>{(p.zipf * 100).toFixed(1)}%</td>
                <td>{(p.uniform * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <div class="cf-meta">
        Simulated LRU cache over {PARAMS.keys.toLocaleString('en-US')} keys and {PARAMS.requests.toLocaleString('en-US')}{' '}
        requests (after a {PARAMS.warmup.toLocaleString('en-US')}-request warm-up). Skewed traffic is Zipf with skew{' '}
        {PARAMS.skew.toFixed(1)}. Seeded, so the numbers are reproducible. Your own traffic will give a different curve.
      </div>
    </figure>
  );
}
