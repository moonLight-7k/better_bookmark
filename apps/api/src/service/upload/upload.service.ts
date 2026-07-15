import chalk from "chalk";
import {
  cleanDocument,
  logger,
  logPerformance,
  retryOperation,
  searchCache,
} from "helper/search/search.helper";
import { BookmarkData } from "types/search";
import * as fs from "fs";
import dotenv from "dotenv";
import { embeddingFunction } from "provider/openai.provider";
import { client } from "provider/chroma.provider";

dotenv.config();

const defaultCollectionName =
  process.env.COLLECTION_NAME || "bookmarks_test_05";

export const initializeCollection = async (
  collectionName: string = defaultCollectionName,
  fileInput?: BookmarkData[] | string
): Promise<boolean> => {
  const startTime = Date.now();

  logger.info(
    `${chalk.cyan("====")} ${chalk.bold.yellow(
      "STARTING COLLECTION INITIALIZATION"
    )} ${chalk.cyan("====")}`
  );
  logger.info(`📂 Collection Name: ${chalk.yellow(collectionName)}`);
  logger.info(
    `📥 Input Type: ${chalk.yellow(
      typeof fileInput === "string"
        ? "file path"
        : Array.isArray(fileInput)
        ? "data array"
        : "none"
    )}`
  );

  try {
    if (!embeddingFunction) {
      logger.error(
        `❌ ${chalk.red(
          "Cannot initialize collection: OpenAI API key is missing"
        )}`
      );
      return false;
    }

    logger.info(
      `🚀 ${chalk.blue(`Initializing collection: ${collectionName}`)}`
    );

    let parsedData: BookmarkData[] = [];

    if (!fileInput) {
      logger.info(`🚀 ${chalk.red("No input data provided")} `);
      return false;
    } else if (typeof fileInput === "string") {
      logger.info(
        `🚀 ${chalk.blue("Initializing collection")} from file: ${chalk.cyan(
          fileInput
        )}`
      );
      try {
        const fileContent = await retryOperation(() =>
          fs.promises.readFile(fileInput, "utf8")
        );
        parsedData = JSON.parse(fileContent);
      } catch (err) {
        logger.error(
          `❌ ${chalk.red(`Failed to read or parse file ${fileInput}:`)} ${err}`
        );
        return false;
      }
    } else {
      logger.info(
        `🚀 ${chalk.blue("Initializing collection")} from provided data array`
      );
      parsedData = fileInput;
    }

    logger.info(
      `📚 Processing ${chalk.green(parsedData.length.toString())} bookmarks`
    );

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      logger.error(`❌ ${chalk.red("Invalid or empty bookmark data")}`);
      return false;
    }

    const textDocuments = parsedData.map(cleanDocument);
    const metadata = parsedData.map((item) => ({
      site: item.site || "",
      title: item.title || "",
      tags: (item.tags || []).join(","),
      dateAdded: item.dateAdded || new Date().toISOString(),
      description: item.description || "",
      rank: item.rank || 0,
      url: item.id || "", // Store URL in metadata instead of ids field
    }));
    // Generate simple numeric IDs instead of using URLs directly
    const ids = parsedData.map((item, index) => `bookmark_${index}`);

    if (
      textDocuments.length !== metadata.length ||
      textDocuments.length !== ids.length
    ) {
      throw new Error("Mismatched array lengths");
    }

    let collection;
    try {
      logger.info(`🔍 ${chalk.blue("Checking for existing collections...")}`);
      const collections = await retryOperation(() => client.listCollections());
      logger.info(
        `📚 Found ${chalk.yellow(
          collections.length
        )} existing collections: ${chalk.cyan(JSON.stringify(collections))}`
      );
      const collectionExists = collections.some((c) => c === collectionName);

      if (collectionExists) {
        logger.info(
          `📊 ${chalk.blue(
            `Collection "${collectionName}" already exists. Getting collection...`
          )}`
        );
        collection = await retryOperation(() =>
          client.getCollection({
            name: collectionName,
            embeddingFunction: embeddingFunction!,
          })
        );
        logger.info(`✅ ${chalk.green("Collection retrieved successfully")}`);
      } else {
        logger.info(
          `➕ ${chalk.blue(`Creating new collection: "${collectionName}"`)}`
        );
        collection = await retryOperation(() =>
          client.createCollection({
            name: collectionName,
            embeddingFunction: embeddingFunction!,
          })
        );
        logger.info(`✅ ${chalk.green("Collection created successfully")}`);
      }
    } catch (error) {
      logger.error(`❌ ${chalk.red("Failed to manage collection:")} ${error}`);
      if (error instanceof Error) {
        logger.error(`Stack trace: ${error.stack}`);
      }
      return false;
    }

    const batchSize = 200;
    const totalBatches = Math.ceil(textDocuments.length / batchSize);
    logger.info(
      `🔄 Processing ${chalk.cyan(
        totalBatches.toString()
      )} batches of documents...`
    );

    let successCount = 0;
    let failedBatches = 0;

    for (let i = 0; i < textDocuments.length; i += batchSize) {
      const batchDocs = textDocuments.slice(i, i + batchSize);
      const batchMeta = metadata.slice(i, i + batchSize);
      const batchIds = ids.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;

      logger.info(
        `⏳ Processing batch ${chalk.cyan(
          currentBatch.toString()
        )}/${chalk.cyan(totalBatches.toString())} - ${chalk.yellow(
          batchDocs.length.toString()
        )} documents`
      );

      try {
        logger.info(
          `📤 ${chalk.blue("Upserting batch")} ${chalk.cyan(
            currentBatch.toString()
          )}/${chalk.cyan(totalBatches.toString())}...`
        );
        await retryOperation(
          () =>
            collection.upsert({
              documents: batchDocs,
              metadatas: batchMeta,
              ids: batchIds,
            }),
          {
            timeout: 60000, // 60 seconds for batch upsert with embeddings
            retries: 3,
            initialDelay: 2000,
            onRetry: (error, attempt) => {
              logger.warn(
                `⚠️  Batch ${currentBatch} upsert failed, retrying (${attempt}/3): ${error.message}`
              );
            },
          }
        );
        successCount += batchDocs.length;
        logger.info(
          `✅ ${chalk.green(
            `Batch ${currentBatch} uploaded successfully (${batchDocs.length} docs)`
          )}`
        );
      } catch (error) {
        failedBatches++;
        logger.error(
          `❌ ${chalk.red(`Failed to process batch ${currentBatch}:`)} ${error}`
        );
        if (error instanceof Error) {
          logger.error(`Error details: ${error.message}`);
          logger.error(`Stack: ${error.stack}`);
        }
      }
    }

    if (failedBatches > 0) {
      logger.warn(
        `⚠️ ${chalk.yellow(
          `${failedBatches} batches failed to process properly`
        )}`
      );
    }

    logger.info(
      `✅ ${chalk.green(
        `Successfully processed ${successCount} of ${textDocuments.length} documents`
      )}`
    );

    if (searchCache && typeof searchCache.clear === "function") {
      searchCache.clear();
      logger.info(`🧹 ${chalk.green("Search cache cleared")}`);
    }

    logger.info(
      `✅ ${chalk.green(
        `Collection "${collectionName}" initialized successfully`
      )}`
    );
    return true;
  } catch (error) {
    logger.error(
      `❌ ${chalk.red("Error during collection initialization:")} ${error}`
    );
    return false;
  } finally {
    logPerformance("Collection initialization", startTime);
  }
};

export { defaultCollectionName };
