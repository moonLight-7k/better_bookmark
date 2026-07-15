import { z } from "zod";

/**
 * Firebase UID format validation
 * Firebase UIDs are typically 28 characters long, alphanumeric
 */
export const userIdSchema = z
  .string()
  .min(1, "User ID is required")
  .max(128, "User ID is too long")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "User ID must contain only alphanumeric characters, hyphens, and underscores"
  );

/**
 * URL validation for bookmark sites
 */
export const urlSchema = z
  .string()
  .url("Invalid URL format")
  .max(2048, "URL is too long");

/**
 * Search query validation
 */
export const searchQuerySchema = z
  .string()
  .min(1, "Search query cannot be empty")
  .max(500, "Search query is too long")
  .trim();

/**
 * Bookmark data validation
 */
export const bookmarkDataSchema = z.object({
  index: z.number().int().min(0),
  rank: z.number().int().min(0).optional(),
  title: z.string().max(500).optional(),
  icon: z.string().url().max(2048).optional().or(z.literal("")),
  description: z.string().max(2000).optional(),
  site: z.string().url().max(2048).optional(),
  id: z.string().max(256).optional(),
  tags: z.array(z.string().max(100)).max(50).optional(),
  dateAdded: z.string().datetime().optional().or(z.string().max(100)),
  clickCount: z.number().int().min(0).optional(),
  pinned: z.boolean().optional(),
});

/**
 * Search request body validation
 */
export const searchRequestSchema = z.object({
  userId: userIdSchema,
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(24),
});

/**
 * Pagination query params validation
 */
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1, {
      message: "Page must be a positive number",
    }),
  limit: z
    .string()
    .optional()
    .default("40")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: "Limit must be between 1 and 100",
    }),
});

/**
 * Upload request validation
 */
export const uploadRequestSchema = z.object({
  userId: userIdSchema,
});

/**
 * Add bookmark request validation
 */
export const addBookmarkRequestSchema = z.object({
  userId: userIdSchema,
  link: urlSchema,
});

/**
 * File upload validation
 */
export const fileUploadSchema = z.object({
  mimetype: z
    .enum([
      "text/html",
      "application/html",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
    ])
    .refine((val) => val !== undefined, {
      message: "Only HTML and ZIP files are allowed",
    }),
  size: z.number().max(50 * 1024 * 1024, "File size must not exceed 50MB"),
});

/**
 * Search options validation
 */
export const searchOptionsSchema = z.object({
  maxResults: z.number().int().min(1).max(1000).optional(),
  minScore: z.number().min(0).max(1).optional(),
  includeMetadata: z.boolean().optional(),
  useCache: z.boolean().optional(),
  metadataFields: z
    .array(
      z.enum(["title", "tags", "description", "rank", "dateAdded", "site"])
    )
    .optional(),
});

/**
 * Helper function to validate and return parsed data
 * Throws ZodError if validation fails
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Helper function to safely validate without throwing
 * Returns { success: true, data } or { success: false, errors }
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
