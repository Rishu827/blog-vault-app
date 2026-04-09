/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        accent: 'var(--color-accent)',
      },
      typography: () => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'var(--color-text)',
            a: {
              color: 'var(--color-accent)',
              textDecoration: 'underline',
              '&:hover': { color: 'var(--color-accent-hover)' },
            },
            'h1, h2, h3, h4, h5, h6': {
              color: 'var(--color-heading)',
            },
            'h2, h3': {
              scrollMarginTop: 'var(--navbar-height)',
            },
            strong: { color: 'var(--color-heading)' },
            blockquote: {
              color: 'var(--color-text-muted)',
              borderLeftColor: 'var(--color-accent)',
            },
            hr: { borderColor: 'var(--color-border)' },
            code: {
              color: 'var(--color-code)',
              backgroundColor: 'var(--color-code-bg)',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '400',
              fontSize: '0.875em',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            pre: {
              backgroundColor: 'var(--color-pre-bg)',
              padding: '0',
              margin: '0',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              fontSize: '0.875em',
            },
            table: { color: 'var(--color-text)' },
            th: { color: 'var(--color-heading)' },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
