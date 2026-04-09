import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z
    .object({
      title: z.string().max(100),
      slug: z.string().optional(),
      description: z.string().min(50).max(160),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional().nullable().default(null),
      author: z.string().optional().default('Dev Author'),
      tags: z
        .array(z.string().toLowerCase())
        .max(5)
        .default([]),
      coverImage: z.string().url().optional().nullable().default(null),
      coverImageAlt: z.string().optional(),
      draft: z.boolean().default(false),
      canonicalURL: z.string().url().optional().nullable().default(null),
    })
    .refine((data) => !data.coverImage || data.coverImageAlt, {
      message: 'coverImageAlt is required when coverImage is set',
      path: ['coverImageAlt'],
    }),
});

export const collections = { blog };
