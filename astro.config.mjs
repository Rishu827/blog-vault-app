import { defineConfig } from 'astro/config';
import { config as dotenvConfig } from 'dotenv';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/serverless';

dotenvConfig(); // loads .env into process.env

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  integrations: [
    mdx({
      syntaxHighlight: 'shiki',
      shikiConfig: {
        themes: {
          light: 'github-light',
          dark: 'github-dark-dimmed',
        },
        wrap: true,
      },
    }),
    tailwind({
      applyBaseStyles: false,
    }),
    preact({ compat: true }),
    sitemap(),
  ],
});
