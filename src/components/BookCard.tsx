import { useState } from 'preact/hooks';

interface Props {
  title: string;
  slug: string;
  description: string;
  readingTime: number;
  spineColor: string;
  labelColor: string;
}

export default function BookCard({ title, slug, description, readingTime, spineColor, labelColor }: Props) {
  const [hovered, setHovered] = useState(false);

  const snippet = description.length > 115 ? description.slice(0, 115) + '…' : description;

  return (
    <div
      style={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Description tooltip — appears above the book */}
      <div
        role="tooltip"
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 14px)',
          left: '50%',
          transform: `translateX(-50%) translateY(${hovered ? '0' : '6px'})`,
          opacity: hovered ? 1 : 0,
          pointerEvents: 'none',
          width: '220px',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '13px 15px 11px',
          boxShadow: '0 10px 32px rgba(0,0,0,0.28)',
          zIndex: 60,
          transition: 'opacity 0.22s ease, transform 0.22s ease',
        }}
      >
        <p style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize: '0.83rem',
          color: 'var(--color-heading)',
          margin: '0 0 7px',
          lineHeight: 1.4,
        }}>
          {title}
        </p>
        <p style={{
          fontSize: '0.72rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.55,
          margin: '0 0 9px',
        }}>
          {snippet}
        </p>
        <p style={{
          fontSize: '0.64rem',
          color: 'var(--color-ornament)',
          margin: 0,
          fontStyle: 'italic',
        }}>
          {readingTime} min read · click to open
        </p>
        {/* Downward arrow */}
        <div style={{
          position: 'absolute',
          bottom: '-7px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: '12px',
          height: '12px',
          background: 'var(--color-bg-card)',
          borderRight: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }} />
      </div>

      {/* The book spine */}
      <a
        href={`/blog/${slug}`}
        aria-label={title}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '68px',
          height: '188px',
          borderRadius: '2px 5px 5px 2px',
          background: `linear-gradient(105deg, rgba(0,0,0,0.18) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.12) 100%), ${spineColor}`,
          transform: hovered ? 'translateY(-20px)' : 'translateY(0)',
          transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease',
          boxShadow: hovered
            ? `5px 10px 28px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.3)`
            : `3px 5px 12px rgba(0,0,0,0.42), 0 1px 3px rgba(0,0,0,0.25)`,
          textDecoration: 'none',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left spine highlight */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '5px',
          width: '3px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
        }} />
        {/* Top rule */}
        <div style={{
          position: 'absolute',
          top: '13px',
          left: '12px',
          right: '12px',
          height: '1px',
          background: 'rgba(255,255,255,0.12)',
        }} />
        {/* Bottom rule */}
        <div style={{
          position: 'absolute',
          bottom: '13px',
          left: '12px',
          right: '12px',
          height: '1px',
          background: 'rgba(255,255,255,0.12)',
        }} />

        {/* Title text, rotated along spine */}
        <span style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize: '0.66rem',
          color: labelColor,
          lineHeight: 1.4,
          maxHeight: '158px',
          overflow: 'hidden',
          textAlign: 'center',
          padding: '0 9px',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          letterSpacing: '0.025em',
        }}>
          {title}
        </span>
      </a>
    </div>
  );
}
