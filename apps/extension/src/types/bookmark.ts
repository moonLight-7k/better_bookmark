import { z } from "zod";

export const BookmarkSchema: z.ZodSchema = z.object({
  id: z.string(),
  parentId: z.string().optional(),
  index: z.number(),
  title: z.string(),
  url: z.string().optional(),
  dateAdded: z.number(),
  children: z.array(z.lazy(() => BookmarkSchema)).optional(),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;
