import { useId } from 'preact/hooks';

// Static diagram: how InnoDB's buffer pool list keeps a table scan away from hot pages.
const BAR_X = 20;
const BAR_W = 456;
const BAR_Y = 106;
const BAR_H = 62;
const YOUNG_W = (BAR_W * 5) / 8;
const MID_X = BAR_X + YOUNG_W;

function Badge({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="9" fill="var(--color-accent)" />
      <text x={x} y={y + 4} text-anchor="middle" font-size="11" font-weight="700" fill="var(--color-bg)">
        {n}
      </text>
    </g>
  );
}

export default function InnoDbMidpoint() {
  const uid = useId();
  const mark = `${uid}-arrow`;
  const label =
    'Diagram of the InnoDB buffer pool list. New pages enter at the midpoint between a young part and an old part, are promoted to young only if accessed again, and otherwise are evicted from the tail.';
  const pages = (x0: number, count: number, kind: 'young' | 'old') =>
    Array.from({ length: count }).map((_, i) => (
      <rect
        key={`${kind}${i}`}
        x={x0 + i * 50}
        y={BAR_Y + 14}
        width="38"
        height="34"
        rx="5"
        fill="var(--color-bg-card)"
        stroke={kind === 'young' ? 'var(--color-accent)' : 'var(--color-border)'}
        stroke-width="1.5"
      />
    ));

  return (
    <figure class="cache-flow not-prose" aria-label={label}>
      <div class="cf-scroll">
        <svg viewBox="0 0 520 244" role="img" aria-label={label} style={{ width: '100%', minWidth: '440px', height: 'auto', display: 'block' }}>
          <defs>
            <marker id={mark} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0 0 L8 4 L0 8 z" fill="var(--color-accent)" />
            </marker>
          </defs>

          {/* the list */}
          <rect x={BAR_X} y={BAR_Y} width={YOUNG_W} height={BAR_H} rx="8" fill="var(--color-bg-secondary)" stroke="var(--color-border)" stroke-width="1.5" />
          <rect x={MID_X} y={BAR_Y} width={BAR_W - YOUNG_W} height={BAR_H} rx="8" fill="var(--color-bg-secondary)" stroke="var(--color-border)" stroke-width="1.5" />
          {pages(BAR_X + 14, 5, 'young')}
          {pages(MID_X + 14, 3, 'old')}
          <text x={BAR_X + YOUNG_W / 2} y={BAR_Y - 8} text-anchor="middle" font-size="12" font-weight="700" fill="var(--color-heading)">
            Young part (hot pages)
          </text>
          <text x={MID_X + (BAR_W - YOUNG_W) / 2} y={BAR_Y + BAR_H + 18} text-anchor="middle" font-size="12" font-weight="700" fill="var(--color-heading)">
            Old part (about 3/8)
          </text>
          <text x={BAR_X} y={BAR_Y + BAR_H + 18} font-size="11" fill="var(--color-text-muted)">
            head
          </text>
          <text x={BAR_X + BAR_W} y={BAR_Y + BAR_H + 34} text-anchor="end" font-size="11" fill="var(--color-text-muted)">
            tail
          </text>

          {/* 1: new page enters at the midpoint */}
          <path d={`M${MID_X} 22 V${BAR_Y - 22}`} stroke="var(--color-accent)" stroke-width="2" fill="none" marker-end={`url(#${mark})`} />
          <text x={MID_X + 14} y="34" font-size="12" fill="var(--color-text)">
            new page enters at the midpoint
          </text>
          <Badge x={MID_X} y={62} n={1} />

          {/* 2: promoted when touched again */}
          <path d={`M${MID_X + 90} ${BAR_Y + BAR_H + 2} C${MID_X + 90} 222 ${BAR_X + 90} 222 ${BAR_X + 90} ${BAR_Y + BAR_H + 4}`} stroke="var(--color-accent)" stroke-width="2" fill="none" marker-end={`url(#${mark})`} />
          <Badge x={(MID_X + BAR_X + 180) / 2} y={207} n={2} />

          {/* 3: evicted from the tail */}
          <path d={`M${BAR_X + BAR_W + 2} ${BAR_Y + BAR_H / 2} H512`} stroke="var(--color-accent)" stroke-width="2" fill="none" marker-end={`url(#${mark})`} />
          <Badge x={494} y={BAR_Y + BAR_H / 2 - 18} n={3} />
          <text x="496" y={BAR_Y + BAR_H / 2 + 20} text-anchor="middle" font-size="11" fill="var(--color-text-muted)">
            evicted
          </text>
        </svg>
      </div>

      <ol class="cf-steps">
        <li>A page read from disk, for a query or by read-ahead, enters at the midpoint: the head of the old part.</li>
        <li>
          If it is touched again, and more than <code>innodb_old_blocks_time</code> (1000 ms by default) has passed since
          its first access, it is promoted to the young part.
        </li>
        <li>A page nobody touches again drifts to the tail and is evicted.</li>
      </ol>
      <div class="cf-meta">
        A big table scan only ever follows steps 1 and 3. It flows through the old part and never reaches the hot pages
        in the young part.
      </div>
    </figure>
  );
}
