# DevBlog

A personal developer blog built with Astro, MDX, Tailwind CSS, and Preact. Statically generated, zero runtime JavaScript by default, deployed on Vercel.

**Live site:** [rishabh-writes.vercel.app](https://rishabh-writes.vercel.app)

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro 4 |
| Content | MDX 3 |
| Styling | Tailwind CSS 3 + Typography plugin |
| Syntax highlighting | Shiki (github-light / github-dark-dimmed) |
| Interactive islands | Preact 10 |
| Comments | Giscus (GitHub Discussions) |
| Package manager | pnpm 9 |
| Deployment | Vercel |

## Features

- **MDX content** with Zod-validated frontmatter — build fails on bad fields, not in production
- **Dark / light / system theme** toggle with no flash of wrong theme on load
- **Syntax-highlighted code blocks** with copy-to-clipboard button
- **Reading time** calculated per post (`ceil(words / 238)`, code blocks at 0.4×)
- **Table of Contents** sticky sidebar (desktop) with active heading tracking via `IntersectionObserver`
- **Reading progress bar** pinned below the navbar
- **Highlight-to-comment** — select any text and comment directly to GitHub Discussions
- **Giscus comments** lazy-loaded, theme-synced with the blog
- **RSS feed** at `/rss.xml`
- **Sitemap** auto-generated at build
- **Full SEO** — OG tags, JSON-LD `BlogPosting`, canonical URLs
- **Draft posts** — visible in dev with a DRAFT badge, completely excluded from production builds
- **WCAG 2.1 AA** — skip link, semantic HTML, keyboard navigation, focus rings, reduced-motion support
- **Security headers** — CSP, `X-Frame-Options: DENY`, `Referrer-Policy` via `vercel.json`

## Project Structure

```
src/
├── components/
│   ├── BaseLayout.astro        # Wraps all pages — head meta, nav, footer, theme script
│   ├── PostLayout.astro        # Blog post wrapper — header, ToC, progress bar, Giscus
│   ├── Navbar.astro            # Site nav with mobile hamburger
│   ├── PostCard.astro          # Post preview card used in lists
│   ├── TagBadge.astro          # Clickable tag pill with hash-derived color
│   ├── Pagination.astro        # Prev / Next page links
│   ├── GiscusComments.astro    # Lazy-loaded GitHub Discussions comments
│   ├── ThemeToggle.tsx         # Preact — light/dark/system toggle
│   ├── TableOfContents.tsx     # Preact — sticky sidebar with scroll tracking
│   ├── CopyCodeButton.tsx      # Preact — injects copy buttons into code blocks
│   ├── ReadingProgress.tsx     # Preact — scroll progress bar
│   └── SelectionComment.tsx    # Preact — highlight-to-comment tooltip
├── content/
│   ├── config.ts               # Zod schema for blog frontmatter
│   └── blog/                   # MDX post files live here
├── pages/
│   ├── index.astro             # Home — hero + 5 recent posts
│   ├── blog/
│   │   ├── index.astro         # Blog index (page 1)
│   │   ├── page/[page].astro   # Blog index pages 2+
│   │   └── [...slug].astro     # Individual post
│   ├── tags/
│   │   ├── index.astro         # All tags with post counts
│   │   ├── [tag].astro         # Tag filter page (page 1)
│   │   └── [tag]/page/[page].astro
│   ├── rss.xml.ts              # RSS 2.0 feed
│   └── 404.astro               # Custom 404
├── styles/
│   └── global.css              # CSS custom properties, Shiki dual-theme, base resets
└── utils/
    └── readingTime.ts          # Reading time calculation
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9 (`npm install -g pnpm@9`)

### Install

```bash
pnpm install
```

### Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
SITE_URL=https://your-blog.vercel.app

GISCUS_REPO=your-github-username/your-repo
GISCUS_REPO_ID=          # from giscus.app
GISCUS_CATEGORY=Blog Comments
GISCUS_CATEGORY_ID=      # from giscus.app
```

See [Setting up Giscus](#setting-up-giscus) below.

### Run locally

```bash
pnpm dev
```

### Build

```bash
pnpm build
pnpm preview   # preview the production build locally
```

## Writing Posts

Create a `.mdx` file in `src/content/blog/`:

```mdx
---
title: "My Post Title"
description: "A 50–160 character description for SEO."
publishDate: 2026-04-10
author: "Your Name"
tags: ["astro", "typescript"]
draft: false
---

Your content here. Full Markdown supported.

## A heading

```typescript
const x = 1;
```
```

### Frontmatter fields

| Field | Required | Description |
|---|---|---|
| `title` | Yes | Max 100 chars. Used in `<title>` and OG tags. |
| `description` | Yes | 50–160 chars. Used as meta description. |
| `publishDate` | Yes | ISO 8601 date. Used for sorting and SEO. |
| `updatedDate` | No | Shown if newer than publishDate. |
| `author` | No | Defaults to site author. |
| `tags` | No | Lowercase strings, max 5. e.g. `["react", "devops"]` |
| `coverImage` | No | Absolute URL to image (Cloudinary recommended). |
| `coverImageAlt` | Cond. | Required when `coverImage` is set. |
| `draft` | No | `true` hides from production. Default `false`. |
| `slug` | No | Custom URL slug. Defaults to filename. |
| `canonicalURL` | No | For cross-posted content. |

**Draft posts** are visible in `pnpm dev` with a DRAFT badge. In `pnpm build` they are completely excluded — not in HTML, RSS, sitemap, or tag counts.

## Setting up Giscus

1. Create a **public** GitHub repository (or use an existing one)
2. Enable **Discussions** in the repo settings (Settings → Features → Discussions)
3. Install the [Giscus app](https://github.com/apps/giscus) on the repo
4. Create a discussion category named **Blog Comments**
5. Visit [giscus.app](https://giscus.app), enter your repo, and copy the `repo-id` and `category-id`
6. Fill in your `.env` file with those values

Giscus maps each post to a Discussion thread by pathname. The first comment on a post automatically creates the thread.

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Set environment variables in Vercel project settings (same keys as `.env`)
4. Deploy — Vercel runs `pnpm build` automatically on every push to `main`

Preview deployments are created for every pull request.

## Routes

| URL | Description |
|---|---|
| `/` | Home — hero and 5 recent posts |
| `/blog` | Paginated post list (10 per page) |
| `/blog/[slug]` | Individual post |
| `/blog/page/2` | Blog index page 2+ |
| `/tags` | All tags with post counts |
| `/tags/[tag]` | Posts filtered by tag |
| `/rss.xml` | RSS 2.0 feed |
| `/sitemap-index.xml` | Sitemap |
| `/404` | Custom 404 page |
