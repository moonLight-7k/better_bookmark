import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { getDataFromDatabase, saveDataToDatabase } from "db/utils";
import { BookmarkData } from "types/search";
import { logger } from "../utils/logger";
import { performance } from "perf_hooks";
import AdmZip from "adm-zip";

/**
 * Helper function to extract HTML files from a zip buffer
 */
export function extractHtmlFromZip(zipBuffer: Buffer): Buffer | null {
  try {
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    logger.info(`📦 Found ${zipEntries.length} files in zip archive`);

    // Find the first HTML file in the zip
    for (const entry of zipEntries) {
      const fileName = entry.entryName.toLowerCase();

      // Skip directories and hidden files
      if (
        entry.isDirectory ||
        fileName.startsWith(".") ||
        fileName.includes("/__MACOSX")
      ) {
        continue;
      }

      // Check if it's an HTML file
      if (fileName.endsWith(".html") || fileName.endsWith(".htm")) {
        logger.info(`📄 Extracting HTML file: ${entry.entryName}`);
        const htmlBuffer = entry.getData();

        if (htmlBuffer && htmlBuffer.length > 0) {
          logger.info(
            `✅ Successfully extracted HTML file (${formatBytes(
              htmlBuffer.length
            )})`
          );
          return htmlBuffer;
        }
      }
    }

    logger.warn("⚠️ No HTML files found in zip archive");
    return null;
  } catch (error) {
    logger.error(`❌ Failed to extract HTML from zip: ${error}`);
    return null;
  }
}

/**
 * Helper function to format bytes into human readable format
 */
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Type definitions for metadata results
 */
type MetadataResult = {
  url: string;
  title: string;
  description: string;
  success: boolean;
};

/**
 * Fetches metadata for a single URL with optimized processing
 * Using regex extraction instead of full DOM parsing for better performance
 */
async function fetchSingleUrlMetadata(url: string): Promise<MetadataResult> {
  const startTime = performance.now();
  const result: MetadataResult = {
    url,
    title: "",
    description: "",
    success: false,
  };

  try {
    if (!url || typeof url !== "string") {
      return result;
    }

    let formattedUrl = url;
    if (!formattedUrl.startsWith("http")) {
      formattedUrl = `https://${url}`;
    }

    try {
      new URL(formattedUrl);
    } catch (e) {
      return result;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MetadataBot/1.0)",
        Accept: "text/html",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return result;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.toLowerCase().includes("text/html")) {
      return result;
    }

    const reader = response.body?.getReader();
    if (!reader) return result;

    let chunks = [];
    let bytesRead = 0;
    const MAX_BYTES = 100000;

    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      bytesRead += value.length;
    }

    reader.cancel();

    const decoder = new TextDecoder();
    const html = chunks
      .map((chunk) => decoder.decode(chunk, { stream: true }))
      .join("");

    const titleMatch =
      html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
      html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i
      );

    const descMatch =
      html.match(
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i
      );

    result.title = titleMatch
      ? titleMatch[1].trim()
      : new URL(formattedUrl).hostname;
    result.description = descMatch ? descMatch[1].trim() : "";
    result.success = true;

    return result;
  } catch (error) {
    return result;
  } finally {
    const endTime = performance.now();
    logger.debug(
      `URL processing time for ${url}: ${(endTime - startTime).toFixed(2)}ms`
    );
  }
}

/**
 * Process a batch of URLs with controlled concurrency
 */
async function batchFetchMetadata(
  urls: string[],
  concurrency: number = 20,
  progressCallback?: (completed: number, total: number) => void
): Promise<MetadataResult[]> {
  const startTime = performance.now();
  const validUrls = urls.filter((url) => url && typeof url === "string");
  const results: MetadataResult[] = [];
  let completed = 0;

  console.log(
    `Starting batch processing of ${validUrls.length} URLs with concurrency ${concurrency}`
  );
  const memoryBefore = process.memoryUsage();

  for (let i = 0; i < validUrls.length; i += concurrency) {
    const batchStartTime = performance.now();
    const batch = validUrls.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map((url) => fetchSingleUrlMetadata(url))
    );

    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          url: batch[index],
          title: "",
          description: "",
          success: false,
        });
      }
    });

    completed += batch.length;
    const batchEndTime = performance.now();
    console.log(
      `Batch ${Math.ceil(i / concurrency) + 1}/${Math.ceil(
        validUrls.length / concurrency
      )} processed in ${(batchEndTime - batchStartTime).toFixed(2)}ms`
    );

    if (progressCallback) {
      progressCallback(completed, validUrls.length);
    }
  }

  const endTime = performance.now();
  const memoryAfter = process.memoryUsage();

  console.log(
    `Batch processing completed in ${(endTime - startTime).toFixed(2)}ms`
  );
  console.log(
    `Memory usage before: RSS ${formatBytes(
      memoryBefore.rss
    )}, Heap ${formatBytes(memoryBefore.heapUsed)}/${formatBytes(
      memoryBefore.heapTotal
    )}`
  );
  console.log(
    `Memory usage after: RSS ${formatBytes(
      memoryAfter.rss
    )}, Heap ${formatBytes(memoryAfter.heapUsed)}/${formatBytes(
      memoryAfter.heapTotal
    )}`
  );
  console.log(
    `Memory increase: RSS ${formatBytes(
      memoryAfter.rss - memoryBefore.rss
    )}, Heap ${formatBytes(memoryAfter.heapUsed - memoryBefore.heapUsed)}`
  );

  return results;
}

/**
 * Legacy function that maintains compatibility with existing code
 * Now uses the optimized implementation internally
 */
async function fetchLinkMetadata(
  url: string
): Promise<{ title: string; description: string }> {
  try {
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      console.warn(`Skipping invalid or non-HTTP(S) URL: ${url}`);
      return { title: "", description: "" };
    }

    const result = await fetchSingleUrlMetadata(url);

    return {
      title: result.title || "",
      description: result.description || "",
    };
  } catch (error: any) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      console.warn(`Timeout fetching metadata for ${url}`);
    } else {
      console.warn(`Error fetching metadata for ${url}:`, error.message);
    }
    return { title: "", description: "" };
  }
}

export async function crawlLinksFromFile(
  fileBuffer: Buffer
): Promise<BookmarkData[]> {
  try {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage();
    logger.info(
      `Starting crawling links from file, buffer size: ${formatBytes(
        fileBuffer.byteLength
      )}`
    );

    const html: string = fileBuffer.toString("utf8");
    const cheerioStartTime = performance.now();
    const $: CheerioAPI = cheerio.load(html);
    const cheerioEndTime = performance.now();
    logger.debug(
      `Cheerio load time: ${(cheerioEndTime - cheerioStartTime).toFixed(2)}ms`
    );

    const links = $("a");
    const crawledData: BookmarkData[] = [];
    const seenHrefs = new Set<string>();
    const urlsToProcess: string[] = [];
    const linkElements: any[] = [];

    logger.info(
      `Found ${links.length} links in HTML, extracting unique URLs...`
    );

    const extractStartTime = performance.now();
    links.each((index: number, element: any) => {
      const href: string | undefined = $(element).attr("href");
      const icon: string | undefined = $(element).attr("icon");
      const add_date: string | undefined = $(element).attr("add_date");
      const title: string | undefined = $(element).attr("innerText");
      const linkText: string = $(element).text().trim();

      if (
        !href ||
        seenHrefs.has(href) ||
        !(href.startsWith("http:") || href.startsWith("https:"))
      ) {
        return;
      }
      seenHrefs.add(href);

      urlsToProcess.push(href);
      linkElements.push({
        href,
        icon,
        add_date,
        title,
        linkText,
      });
    });
    const extractEndTime = performance.now();
    logger.debug(
      `URL extraction time: ${(extractEndTime - extractStartTime).toFixed(2)}ms`
    );

    logger.info(`Processing ${urlsToProcess.length} unique URLs in batches...`);

    const batchProcessStartTime = performance.now();
    const metadataResults = await batchFetchMetadata(
      urlsToProcess,
      20,
      (completed, total) => {
        logger.info(
          `Processed ${completed}/${total} URLs (${Math.round(
            (completed / total) * 100
          )}%)`
        );
      }
    );
    const batchProcessEndTime = performance.now();
    logger.debug(
      `Batch processing total time: ${(
        batchProcessEndTime - batchProcessStartTime
      ).toFixed(2)}ms`
    );

    const metadataMap = new Map<string, MetadataResult>();
    metadataResults.forEach((result) => {
      if (result.success) {
        metadataMap.set(result.url, result);
      }
    });

    const dataCreationStartTime = performance.now();
    linkElements.forEach((elem, index) => {
      const metadata = metadataMap.get(elem.href);

      const data: BookmarkData = {
        index: crawledData.length,
        id: elem.href,
        icon: elem.icon || "",
        dateAdded: elem.add_date,
        site: elem.href,
        title: elem.title || metadata?.title || elem.linkText || elem.href,
        description: metadata?.description || "",
        rank: crawledData.length + 1,
        clickCount: 0,
        pinned: false,
        tags: ["all"],
      };

      crawledData.push(data);
    });
    const dataCreationEndTime = performance.now();
    logger.debug(
      `Data creation time: ${(
        dataCreationEndTime - dataCreationStartTime
      ).toFixed(2)}ms`
    );

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();

    // Calculate detailed metrics
    const totalTime = endTime - startTime;
    const phases = {
      parsing: cheerioEndTime - cheerioStartTime,
      extraction: extractEndTime - extractStartTime,
      batchProcessing: batchProcessEndTime - batchProcessStartTime,
      dataCreation: dataCreationEndTime - dataCreationStartTime,
    };

    const memoryIncrease = {
      rss: memoryAfter.rss - memoryBefore.rss,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      external: memoryAfter.external - memoryBefore.external,
    };

    // Log comprehensive performance report
    logger.info(
      `File processing completed: found ${crawledData.length} valid bookmarks`
    );
    logger.info(`Performance summary:`);
    logger.info(`- Total processing time: ${totalTime.toFixed(2)}ms`);
    logger.info(`- Time breakdown:`);
    logger.info(
      `  - HTML parsing: ${phases.parsing.toFixed(2)}ms (${(
        (phases.parsing / totalTime) *
        100
      ).toFixed(1)}%)`
    );
    logger.info(
      `  - URL extraction: ${phases.extraction.toFixed(2)}ms (${(
        (phases.extraction / totalTime) *
        100
      ).toFixed(1)}%)`
    );
    logger.info(
      `  - Batch processing: ${phases.batchProcessing.toFixed(2)}ms (${(
        (phases.batchProcessing / totalTime) *
        100
      ).toFixed(1)}%)`
    );
    logger.info(
      `  - Data creation: ${phases.dataCreation.toFixed(2)}ms (${(
        (phases.dataCreation / totalTime) *
        100
      ).toFixed(1)}%)`
    );
    logger.info(`- Memory usage:`);
    logger.info(
      `  - Before: RSS ${formatBytes(memoryBefore.rss)}, Heap ${formatBytes(
        memoryBefore.heapUsed
      )}/${formatBytes(memoryBefore.heapTotal)}`
    );
    logger.info(
      `  - After: RSS ${formatBytes(memoryAfter.rss)}, Heap ${formatBytes(
        memoryAfter.heapUsed
      )}/${formatBytes(memoryAfter.heapTotal)}`
    );
    logger.info(
      `  - Increase: RSS ${formatBytes(memoryIncrease.rss)}, Heap ${formatBytes(
        memoryIncrease.heapUsed
      )}`
    );
    logger.info(
      `- Processing rate: ${((urlsToProcess.length / totalTime) * 1000).toFixed(
        2
      )} URLs/second`
    );

    return crawledData;
  } catch (error: any) {
    logger.error(
      `Error processing bookmark file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    logger.debug(
      `Error stack: ${
        error instanceof Error ? error.stack : "No stack available"
      }`
    );
    return [];
  }
}

export async function crawlLinkFromUrl(
  url: string,
  userId: string
): Promise<BookmarkData | null> {
  logger.info(`Crawling URL: ${url} for userId: ${userId}`);

  if (
    !url ||
    !userId ||
    !(url.startsWith("http:") || url.startsWith("https:"))
  ) {
    logger.error("Invalid URL or userId provided");
    return null;
  }

  try {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage();

    // Log CPU usage before processing if available
    try {
      const cpuUsageBefore = process.cpuUsage();
      logger.debug(
        `CPU usage before crawling - user: ${cpuUsageBefore.user}, system: ${cpuUsageBefore.system}`
      );
    } catch (e) {
      // CPU usage might not be available in all environments
      logger.debug("CPU usage metrics not available");
    }

    logger.info(`Starting metadata fetch for ${url}`);
    const metadata = await fetchLinkMetadata(url);

    if (!metadata) {
      logger.error(`Failed to fetch metadata for URL: ${url}`);
      return null;
    }

    const dbFetchStart = performance.now();
    const data = await getDataFromDatabase(userId);
    const dbFetchEnd = performance.now();
    logger.debug(
      `Database fetch time: ${(dbFetchEnd - dbFetchStart).toFixed(2)}ms`
    );

    const length = data.length;

    const bookmark: BookmarkData = {
      index: length,
      id: (length + 1).toString(),
      site: url,
      title: metadata.title || url,
      description: metadata.description,
      rank: length + 1,
      clickCount: 0,
      pinned: false,
      tags: ["all"],
    };

    const dbSaveStart = performance.now();
    await saveDataToDatabase(`${userId}/${bookmark.id}`, bookmark);
    const dbSaveEnd = performance.now();
    logger.debug(
      `Database save time: ${(dbSaveEnd - dbSaveStart).toFixed(2)}ms`
    );

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();

    // Calculate metrics
    const totalTime = endTime - startTime;
    const memoryIncrease = {
      rss: memoryAfter.rss - memoryBefore.rss,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      external: memoryAfter.external - memoryBefore.external,
    };

    // Try to get final CPU usage if available
    try {
      const cpuUsageAfter = process.cpuUsage();
      logger.debug(
        `CPU usage after crawling - user: ${cpuUsageAfter.user}, system: ${cpuUsageAfter.system}`
      );
    } catch (e) {
      // CPU usage might not be available in all environments
    }

    // Log detailed performance metrics
    logger.info(`Performance for URL ${url}:`);
    logger.info(`- Total processing time: ${totalTime.toFixed(2)}ms`);
    logger.info(
      `- Memory before: RSS ${formatBytes(
        memoryBefore.rss
      )}, Heap ${formatBytes(memoryBefore.heapUsed)}/${formatBytes(
        memoryBefore.heapTotal
      )}`
    );
    logger.info(
      `- Memory after: RSS ${formatBytes(memoryAfter.rss)}, Heap ${formatBytes(
        memoryAfter.heapUsed
      )}/${formatBytes(memoryAfter.heapTotal)}`
    );
    logger.info(
      `- Memory increase: RSS ${formatBytes(
        memoryIncrease.rss
      )}, Heap ${formatBytes(memoryIncrease.heapUsed)}`
    );

    return bookmark;
  } catch (error) {
    logger.error(
      `Error processing URL ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    logger.debug(
      `Error stack: ${
        error instanceof Error ? error.stack : "No stack available"
      }`
    );
    return null;
  }
}

export async function crawlLinksFromFileRaw(
  fileBuffer: Buffer
): Promise<BookmarkData[]> {
  try {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage();
    logger.info(
      `Starting crawling links from file, buffer size: ${formatBytes(
        fileBuffer.byteLength
      )}`
    );

    const html: string = fileBuffer.toString("utf8");
    const cheerioStartTime = performance.now();
    const $: CheerioAPI = cheerio.load(html);
    const cheerioEndTime = performance.now();
    logger.debug(
      `Cheerio load time: ${(cheerioEndTime - cheerioStartTime).toFixed(2)}ms`
    );

    const links = $("a");
    const crawledData: BookmarkData[] = [];
    const seenHrefs = new Set<string>();

    logger.info(
      `Found ${links.length} links in HTML, extracting unique URLs...`
    );

    const extractStartTime = performance.now();
    links.each((index: number, element: any) => {
      const href: string | undefined = $(element).attr("href");
      const icon: string | undefined = $(element).attr("icon");
      const add_date: string | undefined = $(element).attr("add_date");
      const linkText: string = $(element).text().trim();

      if (
        !href ||
        seenHrefs.has(href) ||
        !(href.startsWith("http:") || href.startsWith("https:"))
      ) {
        return;
      }
      seenHrefs.add(href);

      const data: BookmarkData = {
        index: crawledData.length,
        id: href,
        icon: icon || "",
        dateAdded: add_date,
        site: href,
        title: linkText || href,
        description: "",
        rank: crawledData.length + 1,
        clickCount: 0,
        pinned: false,
        tags: ["all"],
      };

      crawledData.push(data);
    });
    const extractEndTime = performance.now();

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();

    const totalTime = endTime - startTime;
    const memoryIncrease = {
      rss: memoryAfter.rss - memoryBefore.rss,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      external: memoryAfter.external - memoryBefore.external,
    };

    logger.info(
      `File processing completed: found ${crawledData.length} valid bookmarks`
    );
    logger.info(`Performance summary:`);
    logger.info(`- Total processing time: ${totalTime.toFixed(2)}ms`);
    logger.info(
      `  - HTML parsing: ${(cheerioEndTime - cheerioStartTime).toFixed(2)}ms`
    );
    logger.info(
      `  - URL extraction: ${(extractEndTime - extractStartTime).toFixed(2)}ms`
    );
    logger.info(`- Memory usage:`);
    logger.info(
      `  - Before: RSS ${formatBytes(memoryBefore.rss)}, Heap ${formatBytes(
        memoryBefore.heapUsed
      )}/${formatBytes(memoryBefore.heapTotal)}`
    );
    logger.info(
      `  - After: RSS ${formatBytes(memoryAfter.rss)}, Heap ${formatBytes(
        memoryAfter.heapUsed
      )}/${formatBytes(memoryAfter.heapTotal)}`
    );
    logger.info(
      `  - Increase: RSS ${formatBytes(memoryIncrease.rss)}, Heap ${formatBytes(
        memoryIncrease.heapUsed
      )}`
    );

    return crawledData;
  } catch (error: any) {
    logger.error(
      `Error processing bookmark file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    logger.debug(
      `Error stack: ${
        error instanceof Error ? error.stack : "No stack available"
      }`
    );
    return [];
  }
}
