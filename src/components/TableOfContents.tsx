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

  function handleClick(_slug: string) {
    // Active state updates via IntersectionObserver
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
      {/* Desktop-only sticky sidebar */}
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
