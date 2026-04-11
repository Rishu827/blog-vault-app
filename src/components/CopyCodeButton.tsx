import { useEffect } from 'preact/hooks';

/**
 * Injects a copy-to-clipboard button into every code block on the page.
 * Rendered as a Preact island with client:visible to avoid layout shift.
 */
export default function CopyCodeButton() {
  useEffect(() => {
    const wrappers = document.querySelectorAll<HTMLElement>('.code-block-wrapper');

    wrappers.forEach((wrapper) => {
      // Avoid double-injecting
      if (wrapper.querySelector('.copy-btn')) return;

      const pre = wrapper.querySelector('pre');
      if (!pre) return;

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.setAttribute('title', 'Copy code');
      btn.innerHTML = `
        <svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <svg class="icon-check hidden" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;

      Object.assign(btn.style, {
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '2rem',
        height: '2rem',
        borderRadius: '0.375rem',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-muted)',
        cursor: 'pointer',
        zIndex: '10',
        opacity: '0',
        transition: 'opacity 0.15s, color 0.15s',
      });

      // Show on hover
      wrapper.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
      wrapper.addEventListener('mouseleave', () => {
        if (!btn.classList.contains('copied')) btn.style.opacity = '0';
      });

      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.innerText ?? pre.innerText;
        await navigator.clipboard.writeText(code);

        // Show checkmark for 2 seconds
        const iconCopy = btn.querySelector<SVGElement>('.icon-copy');
        const iconCheck = btn.querySelector<SVGElement>('.icon-check');
        iconCopy?.classList.add('hidden');
        iconCheck?.classList.remove('hidden');
        btn.style.color = 'var(--color-accent)';
        btn.classList.add('copied');
        btn.setAttribute('aria-label', 'Copied!');

        setTimeout(() => {
          iconCopy?.classList.remove('hidden');
          iconCheck?.classList.add('hidden');
          btn.style.color = 'var(--color-text-muted)';
          btn.style.opacity = '0';
          btn.classList.remove('copied');
          btn.setAttribute('aria-label', 'Copy code to clipboard');
        }, 2000);
      });

      pre.style.position = 'relative';
      wrapper.style.position = 'relative';
      wrapper.appendChild(btn);

      // Make pre keyboard-accessible as a scrollable region
      pre.setAttribute('tabindex', '0');
    });
  }, []);

  return null;
}
