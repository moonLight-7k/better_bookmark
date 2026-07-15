import { IncludeEnum } from "chromadb";
import chalk from "chalk";
import { SearchOptions, SearchResult } from "types/search";
import {
  logger,
  logPerformance,
  retryOperation,
  clearCache,
} from "helper/search/search.helper";
import dotenv from "dotenv";
import LRU from "lru-cache";
import path from "path";
import os from "os";
import { embeddingFunction } from "provider/openai.provider";
import { client } from "provider/chroma.provider";

dotenv.config();

const CACHE_TTL_MS = 1000 * 60 * 5;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MAX_CACHE_SIZE = 1000;

const PERSIST_DIRECTORY =
  process.env.CHROMA_PERSIST_DIRECTORY || path.join(os.tmpdir(), "chromadb");

const collectionName = process.env.COLLECTION_NAME || "bookmarks_test_05";

// Replace Map with LRU cache
const searchCache = new LRU({
  max: MAX_CACHE_SIZE,
  ttl: CACHE_TTL_MS,
});

export const semanticSearch = async (
  query: string | string[],
  requestedCollection: string = collectionName,
  options: SearchOptions = {}
): Promise<SearchResult[]> => {
  const {
    maxResults = 1000,
    minScore = 0.5, // Lowered from 0.77 to 0.5 for better recall
    includeMetadata = true,
    useCache = true,
    metadataFields = [
      "title",
      "tags",
      "description",
      "rank",
      "dateAdded",
      "url",
    ],
  } = options;
  const startTime = Date.now();

  const queries = Array.isArray(query) ? query : [query];
  const cacheKey = `${JSON.stringify(
    queries
  )}_${requestedCollection}_${maxResults}_${minScore}_${includeMetadata}_${JSON.stringify(
    metadataFields
  )}`;

  if (useCache) {
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult) {
      logger.info(
        `🔍 ${chalk.green("Cache hit")} for ${
          queries.length > 1
            ? "batch query"
            : `query: ${chalk.cyan(`"${queries[0]}"`)}`
        }`
      );
      return cachedResult as SearchResult[];
    }
  }

  try {
    const collections = await retryOperation(() => client.listCollections());
    logger.info(
      `📚 Available collections: ${chalk.blue(JSON.stringify(collections))}`
    );

    const collectionExists = collections.some((c) => c === requestedCollection);

    if (!collectionExists) {
      logger.warn(
        `📦 ${chalk.yellow(`Collection "${requestedCollection}" not found`)}`
      );
      logger.info(`🔄 ${chalk.blue("Attempting to create collection...")}`);

      // try {
      //   await initializeCollection(requestedCollection);
      // } catch (error) {
      //   logger.error(
      //     `❌ ${chalk.red("Failed to initialize collection:")} ${error}`
      //   );
      // }
    }

    const collection = await retryOperation(() =>
      client.getOrCreateCollection({
        name: requestedCollection,
        embeddingFunction: embeddingFunction,
      })
    );

    // Determine which fields to include in the results
    const includeOptions = [IncludeEnum.Distances];
    if (includeMetadata) {
      includeOptions.push(IncludeEnum.Metadatas);
    }

    // Limit nResults to avoid 422 errors from Chroma Cloud
    // Chroma Cloud has limits on the number of results that can be returned
    const safeMaxResults = Math.min(maxResults, 40); // Cap at 40 results

    logger.info(
      `🔍 Querying ${chalk.cyan(requestedCollection)} with ${chalk.yellow(
        queries.length.toString()
      )} queries, max ${chalk.yellow(safeMaxResults.toString())} results`
    );

    // Process batch or single query
    const result = await retryOperation(() =>
      collection.query({
        queryTexts: queries,
        nResults: safeMaxResults,
        include: includeOptions,
      })
    );

    // DEBUG: Log raw ChromaDB response
    logger.info(
      `🔍 DEBUG: Raw results count: ${result.metadatas[0]?.length || 0}`
    );
    logger.info(
      `🔍 DEBUG: Sample distances: ${JSON.stringify(
        result.distances?.[0]?.slice(0, 5) || []
      )}`
    );

    // Check collection document count
    const collectionCount = await collection.count();
    logger.info(
      `📊 Collection has ${chalk.yellow(
        collectionCount.toString()
      )} total documents`
    );

    // Process all results (handles both single and batch queries)
    const allProcessedResults: SearchResult[] = [];

    for (
      let queryIndex = 0;
      queryIndex < result.metadatas.length;
      queryIndex++
    ) {
      const queryResults = result.metadatas[queryIndex];

      const processedResults =
        queryResults?.map((metadata: any, index: number) => {
          const distance = result?.distances?.[queryIndex]?.[index] || 0;
          const normalizedScore = Math.max(0, Math.min(1, (2 - distance) / 2));

          // DEBUG: Log first few results
          if (index < 3) {
            logger.info(
              `🔍 DEBUG Result ${index}: distance=${distance}, score=${normalizedScore}, title="${
                metadata.title || "N/A"
              }"`
            );
          }

          return {
            index: index,
            site: metadata.site || "",
            score: normalizedScore,
            ...(includeMetadata
              ? {
                  ...(metadataFields.includes("title")
                    ? { title: metadata.title || "" }
                    : {}),
                  ...(metadataFields.includes("tags")
                    ? {
                        tags: metadata.tags
                          ? metadata.tags.split(",").filter(Boolean)
                          : [],
                      }
                    : {}),
                  ...(metadataFields.includes("description")
                    ? { description: metadata.description || "" }
                    : {}),
                  ...(metadataFields.includes("rank")
                    ? { rank: metadata.rank || index + 1 }
                    : {}),
                  ...(metadataFields.includes("dateAdded")
                    ? { dateAdded: metadata.dateAdded || "" }
                    : {}),
                  ...(metadataFields.includes("url")
                    ? { url: metadata.url || "" }
                    : {}),
                }
              : {}),
          };
        }) || [];

      allProcessedResults.push(...processedResults);
    }

    logger.info(
      `📊 Total processed results before filtering: ${chalk.yellow(
        allProcessedResults.length.toString()
      )}`
    );
    logger.info(
      `🎯 Filtering with minScore threshold: ${chalk.yellow(
        minScore.toString()
      )}`
    );

    const filteredResults = allProcessedResults.filter(
      (result) => result.score >= minScore
    );

    logger.info(
      `📊 Results after filtering (score >= ${minScore}): ${chalk.yellow(
        filteredResults.length.toString()
      )}`
    );
    logger.info(
      `📊 Filtered out: ${chalk.red(
        (allProcessedResults.length - filteredResults.length).toString()
      )} results below threshold`
    );

    if (useCache) {
      searchCache.set(cacheKey, filteredResults);
      logger.debug(
        `💾 Saved ${chalk.green(
          filteredResults.length.toString()
        )} results to cache`
      );
    }

    logger.info(
      `✅ Found ${chalk.green(filteredResults.length.toString())} results for ${
        queries.length > 1
          ? `${queries.length} queries`
          : `query: ${chalk.cyan(`"${queries[0]}"`)}`
      }`
    );
    return filteredResults;
  } catch (error) {
    logger.error(
      `❌ ${chalk.red("Error performing semantic search:")} ${error}`
    );
    throw error;
  } finally {
    logPerformance(
      `Search for "${Array.isArray(query) ? query.join(", ") : query}"`,
      startTime
    );
  }
};

export const getCollectionStats = async (
  requestedCollection: string = collectionName
): Promise<any> => {
  try {
    const collection = await retryOperation(() =>
      client.getCollection({
        name: requestedCollection,
        embeddingFunction: embeddingFunction!,
      })
    );

    const count = await collection.count();
    logger.info(
      `📊 ${chalk.blue("Collection stats:")} ${chalk.magenta(
        requestedCollection
      )} has ${chalk.green(count.toString())} documents`
    );

    return {
      collectionName: requestedCollection,
      documentCount: count,
      cacheSize: searchCache.size || 0,
      cacheTTL: CACHE_TTL_MS,
      persistDirectory: PERSIST_DIRECTORY,
    };
  } catch (error) {
    logger.error(
      `❌ ${chalk.red("Error fetching collection stats:")} ${error}`
    );
    throw error;
  }
};

export default {
  semanticSearch,
  clearCache,
  getCollectionStats,
};
