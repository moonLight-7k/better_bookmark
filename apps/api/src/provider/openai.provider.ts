import chalk from "chalk";
import { OpenAIEmbeddingFunction } from "chromadb";
import { logger } from "utils/logger";
import dotenv from "dotenv";

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY!;
export let embeddingFunction: OpenAIEmbeddingFunction | undefined;

if (!openaiApiKey) {
  logger.error(
    `❌ ${chalk.red("OPENAI_API_KEY is not set in the environment")}`
  );
  logger.warn(
    `⚠️ ${chalk.yellow("Embedding functionality will not work properly")}`
  );
} else {
  embeddingFunction = new OpenAIEmbeddingFunction({
    openai_api_key: openaiApiKey,
  });
}
