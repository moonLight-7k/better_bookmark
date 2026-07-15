import { Request, Response } from "express";
import { initializeCollection } from "service/upload/upload.service";
import { logger } from "../../utils/logger";
import { updateDataInDatabase } from "db/utils";
import { crawlLinksFromFileRaw, extractHtmlFromZip } from "utils/crawler";
import { uploadRequestSchema, fileUploadSchema } from "validation/schemas";
import { ZodError } from "zod";
import NodeCache from "node-cache";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Import the bookmark cache to clear it on upload
const bookmarkCache = new NodeCache({ stdTTL: 300 });

export const handleUploadController = async (
  req: MulterRequest,
  res: Response
) => {
  try {
    const file = req.file;

    // Validate userId from request body
    const { userId } = uploadRequestSchema.parse(req.body);

    if (!file) {
      res.status(400).json({
        success: false,
        message: "No file provided",
      });
      return;
    }

    // Validate file
    fileUploadSchema.parse({
      mimetype: file.mimetype,
      size: file.size,
    });

    // Handle zip files - extract HTML first
    let fileBuffer = file.buffer;
    const isZipFile =
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed";

    if (isZipFile) {
      logger.info(`📦 Processing zip file: ${file.originalname}`);
      const extractedHtml = extractHtmlFromZip(file.buffer);

      if (!extractedHtml) {
        res.status(400).json({
          success: false,
          message: "No HTML files found in the zip archive",
        });
        return;
      }

      fileBuffer = extractedHtml;
      logger.info("✅ Successfully extracted HTML from zip file");
    }

    const formattedData = await crawlLinksFromFileRaw(fileBuffer);
    if (!formattedData) {
      res.status(400).json({
        success: false,
        message: "Failed to format data",
      });
      return;
    }
    if (!formattedData.length) {
      res.status(400).json({
        success: false,
        message: "No valid links found in the file",
      });
      return;
    }

    // Update Firebase first - store bookmarks in the correct path
    await updateDataInDatabase(`users/${userId}/bookmarks`, formattedData);

    // Then update ChromaDB
    const response = await initializeCollection(userId, formattedData);

    if (!response) {
      logger.error(
        `Failed to initialize collection from file: ${file.originalname}`
      );
      // Note: Firebase data was already updated, consider rollback mechanism
      res.status(400).json({
        success: false,
        message: "Failed to initialize collection",
      });
      return;
    }

    // Clear caches for this user
    const bookmarkCacheKey = `bookmarks_${userId}`;
    bookmarkCache.del(bookmarkCacheKey);
    logger.info(`🧹 Cleared bookmark cache for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        bookmarksProcessed: formattedData.length,
      },
    });
    return;
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: "Validation Error",
        message: error.issues[0]?.message || "Invalid input",
        details: error.issues,
      });
      return;
    }

    logger.error(
      `Upload error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
    return;
  }
};

export { bookmarkCache };
