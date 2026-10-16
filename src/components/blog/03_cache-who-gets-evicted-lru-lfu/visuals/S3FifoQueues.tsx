import { useId } from 'preact/hooks';

// Static diagram: the three queues of S3-FIFO (Yang et al., SOSP 2023).
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

export default function S3FifoQueues() {
  const uid = useId();
  const mark = `${uid}-arrow`;
  const label =
    'Diagram of the three S3-FIFO queues. New objects enter a small queue. Objects reused there move to the main queue. Others are evicted and only their keys go to a ghost queue. A request that finds its key in the ghost queue goes straight to the main queue.';
  const line = { stroke: 'var(--color-accent)', 'stroke-width': 2, fill: 'none' } as const;

  return (
    <figure class="cache-flow not-prose" aria-label={label}>
      <div class="cf-scroll">
        <svg viewBox="0 0 520 248" role="img" aria-label={label} style={{ width: '100%', minWidth: '440px', height: 'auto', display: 'block' }}>
          <defs>
            <marker id={mark} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0 0 L8 4 L0 8 z" fill="var(--color-accent)" />
            </marker>
          </defs>

          {/* queues */}
          <rect x="112" y="52" width="130" height="62" rx="8" fill="var(--color-bg-card)" stroke="var(--color-border)" stroke-width="1.5" />
          <text x="177" y="78" text-anchor="middle" font-size="13" font-weight="700" fill="var(--color-heading)">Small queue</text>
          <text x="177" y="97" text-anchor="middle" font-size="11" fill="var(--color-text-muted)">10% of the cache</text>

          <rect x="332" y="52" width="176" height="62" rx="8" fill="var(--color-bg-card)" stroke="var(--color-border)" stroke-width="1.5" />
          <text x="420" y="78" text-anchor="middle" font-size="13" font-weight="700" fill="var(--color-heading)">Main queue</text>
          <text x="420" y="97" text-anchor="middle" font-size="11" fill="var(--color-text-muted)">90% of the cache</text>

          <rect x="332" y="170" width="176" height="62" rx="8" fill="var(--color-bg-secondary)" stroke="var(--color-border)" stroke-width="1.5" stroke-dasharray="5 4" />
          <text x="420" y="196" text-anchor="middle" font-size="13" font-weight="700" fill="var(--color-heading)">Ghost queue</text>
          <text x="420" y="215" text-anchor="middle" font-size="11" fill="var(--color-text-muted)">keys only, no data</text>

          {/* 1: new object -> small */}
          <path d="M14 83 H110" {...line} marker-end={`url(#${mark})`} />
          <text x="14" y="70" font-size="12" fill="var(--color-text)">new object</text>
          <Badge x={62} y={100} n={1} />

          {/* 2: small -> main (reused) */}
          <path d="M244 83 H330" {...line} marker-end={`url(#${mark})`} />
          <Badge x={287} y={66} n={2} />

          {/* 3: small -> ghost (not reused) */}
          <path d="M177 116 V201 H330" {...line} marker-end={`url(#${mark})`} />
          <Badge x={177} y={160} n={3} />

          {/* 4: ghost hit -> main */}
          <path d="M452 168 V116" {...line} marker-end={`url(#${mark})`} />
          <Badge x={452} y={142} n={4} />

          {/* 5: main -> out */}
          <path d="M376 50 V16" {...line} marker-end={`url(#${mark})`} />
          <Badge x={376} y={32} n={5} />
          <text x="392" y="36" font-size="11" fill="var(--color-text-muted)">evicted</text>
        </svg>
      </div>

      <ol class="cf-steps">
        <li>A new object goes into the small queue, unless its key is still in the ghost queue (see 4).</li>
        <li>When the small queue is full, an object that was accessed more than once while waiting moves to the main queue.</li>
        <li>An object that was not reused is evicted, and only its key is remembered in the ghost queue.</li>
        <li>If a request arrives for an object whose key is in the ghost queue, it skips the small queue and goes straight to main.</li>
        <li>The main queue works like FIFO with reinsertion: an object that was reused gets another lap, with its counter reduced, before it is finally evicted.</li>
      </ol>
      <div class="cf-meta">Simplified, and not to scale. Queue sizes are the defaults from the paper.</div>
    </figure>
  );
}
