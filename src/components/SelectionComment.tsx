import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
  repo: string;         // e.g. "Rishu827/blog-vault-app"
  category: string;     // e.g. "Blog Comments"
  pageTitle: string;
  pageUrl: string;
}

interface TooltipPos {
  x: number;
  y: number;
}

export default function SelectionComment({ repo, category, pageTitle, pageUrl }: Props) {
  const [tooltip, setTooltip] = useState<TooltipPos | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const article = document.getElementById('article-body');
    if (!article) return;

    function onMouseUp(e: MouseEvent) {
      // Small delay so selection is finalised
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? '';

        if (!text || text.length < 10) {
          setTooltip(null);
          setSelectedText('');
          return;
        }

        // Only show if the selection is inside the article body
        const range = sel?.getRangeAt(0);
        if (!range) return;
        if (!article!.contains(range.commonAncestorContainer)) {
          setTooltip(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setTooltip({
          x: rect.left + rect.width / 2 + window.scrollX,
          y: rect.top + window.scrollY - 8,
        });
      }, 10);
    }

    function onMouseDown(e: MouseEvent) {
      // Hide tooltip if clicking outside it
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltip(null);
        setSelectedText('');
      }
    }

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  function openDiscussion() {
    // Category slug: lowercase, spaces → hyphens
    const categorySlug = category.toLowerCase().replace(/\s+/g, '-');

    const quotedBody = [
      `> ${selectedText.split('\n').join('\n> ')}`,
      '',
      `*From [${pageTitle}](${pageUrl})*`,
      '',
      '---',
      '',
      '<!-- Add your comment below -->',
    ].join('\n');

    const discussionTitle = `Comment on "${pageTitle}"`;

    const url = new URL(`https://github.com/${repo}/discussions/new`);
    url.searchParams.set('category', categorySlug);
    url.searchParams.set('title', discussionTitle);
    url.searchParams.set('body', quotedBody);

    window.open(url.toString(), '_blank', 'noopener,noreferrer');
    setTooltip(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  }

  if (!tooltip) return null;

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'absolute',
        left: tooltip.x,
        top: tooltip.y,
        transform: 'translate(-50%, -100%)',
        zIndex: 50,
      }}
    >
      <button
        onClick={openDiscussion}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 whitespace-nowrap"
        style={{
          backgroundColor: 'var(--color-accent)',
          color: '#fff',
          borderColor: 'transparent',
          '--tw-ring-color': 'var(--color-accent)',
        }}
        aria-label="Comment on selected text in GitHub Discussions"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Comment on GitHub
      </button>
      {/* Arrow */}
      <div style={{
        position: 'absolute',
        bottom: '-5px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid var(--color-accent)',
      }} />
    </div>
  );
}
