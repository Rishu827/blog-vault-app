import { useState, useEffect, useRef } from 'preact/hooks';

export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

interface Props {
  headings: Heading[];
}

export default function TableOfContents({ headings }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Filter to H2 and H3 only
  const tocHeadings = headings.filter((h) => h.depth === 2 || h.depth === 3);

  useEffect(() => {
    if (tocHeadings.length === 0) return;

    const headingEls = tocHeadings
      .map((h) => document.getElementById(h.slug))
      .filter(Boolean) as HTMLElement[];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible heading
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-64px 0px -80% 0px',
        threshold: 0,
      }
    );

    headingEls.forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, [tocHeadings.map((h) => h.slug).join(',')]);

  if (tocHeadings.length === 0) return null;

  function handleClick(slug: string) {
    setIsOpen(false);
    // Let browser handle scroll; active state updates via observer
    // Close mobile ToC after click
  }

  const TocList = () => (
    <ol class="list-none p-0 m-0 space-y-1 text-sm">
      {tocHeadings.map((heading) => (
        <li
          key={heading.slug}
          style={heading.depth === 3 ? 'padding-left: 1rem;' : ''}
        >
          <a
            href={`#${heading.slug}`}
            onClick={() => handleClick(heading.slug)}
            class={`block py-0.5 transition-colors hover:underline ${
              activeId === heading.slug ? 'font-semibold' : ''
            }`}
            style={
              activeId === heading.slug
                ? 'color: var(--color-accent);'
                : 'color: var(--color-text-muted);'
            }
            aria-current={activeId === heading.slug ? 'true' : undefined}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      {/* Mobile: collapsible */}
      <div
        class="xl:hidden rounded-lg border p-4 mb-8"
        style="border-color: var(--color-border); background-color: var(--color-bg-secondary);"
      >
        <button
          onClick={() => setIsOpen((o) => !o)}
          class="flex items-center justify-between w-full text-sm font-semibold"
          style="color: var(--color-heading);"
          aria-expanded={isOpen}
          aria-controls="toc-mobile-list"
        >
          <span>Table of Contents</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            style={`transform: rotate(${isOpen ? '180deg' : '0deg'}); transition: transform 0.2s;`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {isOpen && (
          <div id="toc-mobile-list" class="mt-3">
            <TocList />
          </div>
        )}
      </div>

      {/* Desktop: sticky sidebar (rendered by PostLayout) */}
      <div
        class="hidden xl:block sticky top-[calc(var(--navbar-height)+1rem)] max-h-[calc(100vh-var(--navbar-height)-2rem)] overflow-y-auto"
        aria-label="Table of contents"
      >
        <p class="text-xs font-semibold uppercase tracking-wider mb-3" style="color: var(--color-text-muted);">
          On this page
        </p>
        <TocList />
      </div>
    </>
  );
}
