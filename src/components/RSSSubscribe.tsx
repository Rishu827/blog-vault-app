import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
  feedUrl: string;
}

export default function RSSSubscribe({ feedUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const encoded = encodeURIComponent(feedUrl);

  const readers = [
    {
      name: 'Feedly',
      href: `https://feedly.com/i/subscription/feed/feed%2F${encoded}`,
    },
    {
      name: 'Inoreader',
      href: `https://www.inoreader.com/?add_feed=${encoded}`,
    },
    {
      name: 'NewsBlur',
      href: `https://newsblur.com/?url=${encoded}`,
    },
  ];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        class="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
        style="border-color: var(--color-border); color: var(--color-text); --tw-ring-color: var(--color-accent);"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color: var(--color-accent);">
          <circle cx="6.18" cy="17.82" r="2.18"/>
          <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/>
        </svg>
        Subscribe via RSS
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style={`transform: rotate(${open ? '180deg' : '0deg'}); transition: transform 0.15s;`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          class="absolute right-0 mt-2 rounded-xl border shadow-lg overflow-hidden z-50"
          style="min-width: 240px; background-color: var(--color-bg-card); border-color: var(--color-border);"
        >
          {/* Feed URL row */}
          <div class="px-3 py-2.5 border-b flex items-center gap-2" style="border-color: var(--color-border);">
            <code class="text-xs truncate flex-1" style="color: var(--color-text-muted);">
              {feedUrl}
            </code>
            <button
              onClick={copy}
              aria-label={copied ? 'Copied!' : 'Copy feed URL'}
              class="flex-shrink-0 p-1 rounded hover:opacity-70 transition-opacity focus-visible:outline-none"
              style="color: copied ? 'var(--color-accent)' : 'var(--color-text-muted)';"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color: var(--color-accent);">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              )}
            </button>
          </div>

          {/* Reader links */}
          <p class="px-3 pt-2.5 pb-1 text-xs font-semibold uppercase tracking-wider" style="color: var(--color-text-muted);">
            Open in reader
          </p>
          {readers.map(({ name, href }) => (
            <a
              key={name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              class="flex items-center justify-between px-3 py-2 text-sm hover:opacity-80 transition-opacity"
              style="color: var(--color-text);"
              onClick={() => setOpen(false)}
            >
              {name}
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color: var(--color-text-muted);">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
