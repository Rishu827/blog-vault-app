import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => {
    return !data.draft && data.publishDate <= new Date();
  });

  const sorted = posts.sort(
    (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf()
  );

  return rss({
    title: 'DevBlog',
    description: 'A personal developer blog about software engineering, architecture, and tooling.',
    site: context.site ?? 'https://example.com',
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      link: `/blog/${post.data.slug ?? post.slug}`,
      pubDate: post.data.publishDate,
      categories: post.data.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}
