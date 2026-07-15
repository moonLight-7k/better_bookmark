import chalk from "chalk";
import { ChromaClient } from "chromadb";
import dotenv from "dotenv";
import {
  cleanDocument,
  logger,
  retryOperation,
} from "helper/search/search.helper";
import { client } from "provider/chroma.provider";
import { embeddingFunction } from "provider/openai.provider";
import { defaultCollectionName } from "service/upload/upload.service"; // Assuming defaultCollectionName is exported
import { BookmarkData } from "types/search";

dotenv.config();

/**
 * Adds a single bookmark to the specified ChromaDB collection.
 * @param bookmarkData - The data for the bookmark to add.
 * @param collectionName - The name of the collection to add the bookmark to. Defaults to `defaultCollectionName`.
 * @returns True if the bookmark was added successfully, false otherwise.
 */
export const addBookmark = async (
  bookmarkData: BookmarkData,
  collectionName: string = defaultCollectionName
): Promise<boolean> => {
  const startTime = Date.now();
  try {
    if (!embeddingFunction) {
      logger.error(
        `❌ ${chalk.red("Cannot add bookmark: OpenAI API key is missing")}`
      );
      return false;
    }
    if (!bookmarkData || !bookmarkData.id) {
      logger.error(`❌ ${chalk.red("Invalid bookmark data or missing ID")}`);
      return false;
    }

    logger.info(
      `➕ ${chalk.blue(
        `Adding bookmark ID: ${bookmarkData.id} to collection: ${collectionName}`
      )}`
    );

    let collection;
    try {
      collection = await retryOperation(() =>
        client.getCollection({
          name: collectionName,
          embeddingFunction: embeddingFunction!,
        })
      );
    } catch (error) {
      logger.error(
        `❌ ${chalk.red(
          `Failed to get collection "${collectionName}":`
        )} ${error}`
      );
      // Optionally, create the collection if it doesn't exist, or return false
      // For now, we assume the collection exists as initialization is separate
      return false;
    }

    const doc = cleanDocument(bookmarkData);
    const meta = {
      site: bookmarkData.site || "",
      title: bookmarkData.title || "",
      tags: (bookmarkData.tags || []).join(","),
      dateAdded: bookmarkData.dateAdded || new Date().toISOString(),
      description: bookmarkData.description || "",
      rank: bookmarkData.rank || 0,
    };
    const id = bookmarkData.id;

    try {
      await retryOperation(() =>
        collection.upsert({
          documents: [doc],
          metadatas: [meta],
          ids: [id],
        })
      );
      logger.info(
        `✅ ${chalk.green(
          `Successfully added bookmark ID: ${id} to collection "${collectionName}"`
        )}`
      );
      // Consider clearing specific cache entries if applicable, or clearing all cache
      // if (searchCache && typeof searchCache.clear === 'function') {
      //   searchCache.clear();
      //   logger.info(`🧹 ${chalk.green('Search cache cleared after adding bookmark')}`);
      // }
      return true;
    } catch (error) {
      logger.error(
        `❌ ${chalk.red(
          `Failed to add bookmark ID: ${id} to collection "${collectionName}":`
        )} ${error}`
      );
      return false;
    }
  } catch (error) {
    logger.error(`❌ ${chalk.red("Error adding bookmark:")} ${error}`);
    return false;
  } finally {
    const duration = Date.now() - startTime;
    logger.info(`⏱️ Add bookmark operation took ${duration}ms`);
  }
};
