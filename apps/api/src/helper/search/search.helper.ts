import chalk from "chalk";
import { BookmarkData, SearchResult } from "types/search";
import winston from "winston";

const consoleFormat = winston.format.printf((info) => {
  const timestamp = chalk.gray(`[${info.timestamp}]`);
  let level;

  switch (info.level) {
    case "error":
      level = chalk.red.bold(`[${info.level}]`);
      break;
    case "warn":
      level = chalk.yellow.bold(`[${info.level}]`);
      break;
    case "info":
      level = chalk.blue.bold(`[${info.level}]`);
      break;
    case "debug":
      level = chalk.green.bold(`[${info.level}]`);
      break;
    default:
      level = chalk.gray(`[${info.level}]`);
  }

  return `${timestamp} ${level}: ${info.message}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), consoleFormat),
    }),
    new winston.transports.File({
      filename: "app.log",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(
          (info) =>
            `${info.timestamp} [${info.level}]: ${info.message}${
              info.stack ? "\n" + info.stack : ""
            }`
        )
      ),
    }),
  ],
});

export const logPerformance = (operation: string, startTime: number) => {
  const duration = Date.now() - startTime;
  const message = `${operation} completed in ${duration}ms`;

  if (duration > 2000) {
    logger.warn(chalk.yellow(`⚠️ ${message} (slow)`));
  } else if (duration > 1000) {
    logger.info(chalk.cyan(`ℹ️ ${message}`));
  } else {
    logger.debug(chalk.green(`✓ ${message}`));
  }
};

export const cleanDocument = (item: BookmarkData): string => {
  const content = [
    item.title || "",
    item.description || "",
    item.site || "",
    ...(item.tags || []),
    item.description || "",
  ].join(" ");

  return content.toLowerCase().trim();
};

export const searchCache = new Map<
  string,
  { timestamp: number; results: SearchResult[] }
>();
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 10000;
const DEFAULT_OPERATION_TIMEOUT_MS = 5000;

/**
 * Executes an operation with automatic retries using exponential backoff
 *
 * @param operation - The async operation to execute
 * @param options - Configuration options for the retry mechanism
 * @returns The result of the operation
 * @throws The last error encountered after all retries are exhausted
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    initialDelay?: number;
    maxDelay?: number;
    timeout?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> => {
  const {
    retries = MAX_RETRIES,
    initialDelay = INITIAL_RETRY_DELAY_MS,
    maxDelay = MAX_RETRY_DELAY_MS,
    timeout = DEFAULT_OPERATION_TIMEOUT_MS,
    onRetry,
  } = options;

  let currentRetry = 0;
  let lastError: Error | unknown;

  const executeWithTimeout = async (): Promise<T> => {
    return new Promise<T>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = await operation();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  };

  while (true) {
    try {
      return await executeWithTimeout();
    } catch (error) {
      lastError = error;

      if (currentRetry >= retries) {
        logger.error(
          `Operation failed after ${retries} retries: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        throw error;
      }

      currentRetry++;
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(2, currentRetry - 1),
        maxDelay
      );

      if (onRetry && error instanceof Error) {
        onRetry(error, currentRetry);
      }

      logger.warn(
        `${chalk.yellow(
          "⚠️ Operation failed"
        )}, retrying in ${delay}ms. Attempt ${currentRetry}/${retries}. Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      // Wait before the next retry attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

/**
 * Clears the search cache and logs statistics
 *
 * @param options - Options for cache clearing
 * @returns Number of entries removed from cache
 */
export const clearCache = (
  options: {
    onlyExpired?: boolean;
    logStats?: boolean;
  } = {}
): number => {
  const { onlyExpired = false, logStats = true } = options;
  const now = Date.now();
  const previousSize = searchCache.size;

  if (onlyExpired) {
    let expiredCount = 0;
    searchCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_TTL_MS) {
        searchCache.delete(key);
        expiredCount++;
      }
    });

    if (logStats && expiredCount > 0) {
      logger.info(
        `🧹 ${chalk.green(
          `Expired cache entries cleared`
        )} (removed ${chalk.yellow(expiredCount.toString())} entries, ${
          searchCache.size
        } remaining)`
      );
    }

    return expiredCount;
  } else {
    searchCache.clear();

    if (logStats) {
      logger.info(
        `🧹 ${chalk.green(
          "Search cache completely cleared"
        )} (removed ${chalk.yellow(previousSize.toString())} entries)`
      );
    }

    return previousSize;
  }
};

/**
 * Gets cache health statistics
 *
 * @returns Cache statistics object
 */
export const getCacheStats = (): {
  size: number;
  expiredCount: number;
  avgAge: number;
  oldestEntry: number;
} => {
  const now = Date.now();
  let expiredCount = 0;
  let totalAge = 0;
  let oldestEntry = now;

  searchCache.forEach((value) => {
    const age = now - value.timestamp;
    if (age > CACHE_TTL_MS) expiredCount++;
    totalAge += age;
    if (value.timestamp < oldestEntry) oldestEntry = value.timestamp;
  });

  return {
    size: searchCache.size,
    expiredCount,
    avgAge: searchCache.size > 0 ? totalAge / searchCache.size : 0,
    oldestEntry: searchCache.size > 0 ? now - oldestEntry : 0,
  };
};
