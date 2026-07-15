import { getDataFromDatabase } from "db/utils";
import { Request, Response } from "express";
import { bookmarkCache } from "../upload/upload.controller";
import { paginationQuerySchema } from "validation/schemas";
import { ZodError } from "zod";

export const handleGetAllBookmarksController = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.params;

    // userId is already validated by authorizeUser middleware
    if (!userId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    // Parse pagination params from query string
    const { page, limit } = paginationQuerySchema.parse({
      page: req.query.page as string,
      limit: req.query.limit as string,
    });

    // Check if data exists in cache
    const cacheKey = `bookmarks_${userId}`;
    const cachedBookmarks = bookmarkCache.get(cacheKey);

    let bookmarks;
    if (cachedBookmarks) {
      console.log("Serving bookmarks from cache for user:", userId);
      bookmarks = cachedBookmarks;
    } else {
      // If not in cache, fetch from database
      bookmarks = await getDataFromDatabase(`users/${userId}/bookmarks`);
      console.log("Fetched bookmarks:", bookmarks?.length);

      if (!bookmarks) {
        res.status(404).json({
          error: "No bookmarks found",
          message: "This user has no bookmarks yet",
        });
        return;
      }

      // Store in cache
      bookmarkCache.set(cacheKey, bookmarks);
    }

    // Apply pagination
    const totalResults = bookmarks.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBookmarks = bookmarks.slice(startIndex, endIndex);
    const totalPages = Math.ceil(totalResults / limit);

    res.status(200).json({
      totalResults,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      data: paginatedBookmarks,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: "Validation Error",
        message: err.issues[0]?.message || "Invalid pagination parameters",
        details: err.issues,
      });
      return;
    }

    console.error("Error in handleGetAllBookmarksController:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
