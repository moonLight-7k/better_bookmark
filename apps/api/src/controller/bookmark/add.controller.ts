import { Request, Response } from "express";
import { addBookmark } from "service/bookmark/bookmark.service";
import { crawlLinkFromUrl } from "utils/crawler";
import { addBookmarkRequestSchema } from "validation/schemas";
import { ZodError } from "zod";
import { bookmarkCache } from "../upload/upload.controller";
import { logger } from "../../utils/logger";

export default async function addBookmarkController(
  req: Request,
  res: Response
) {
  try {
    // Validate request body
    const { userId, link } = addBookmarkRequestSchema.parse(req.body);

    const formattedData = await crawlLinkFromUrl(link, userId);
    console.log("formattedData", formattedData);

    if (!formattedData) {
      res.status(400).json({ error: "Invalid URL or no data found" });
      return;
    }

    await addBookmark(formattedData, userId);

    // Clear cache for this user
    const bookmarkCacheKey = `bookmarks_${userId}`;
    bookmarkCache.del(bookmarkCacheKey);
    logger.info(`🧹 Cleared bookmark cache for user: ${userId}`);

    res.status(200).json({
      message: "Bookmark added successfully",
      bookmark: formattedData,
    });
    return;
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Validation Error",
        message: error.issues[0]?.message || "Invalid input",
        details: error.issues,
      });
      return;
    }

    console.error("Error in addBookmarkController:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
