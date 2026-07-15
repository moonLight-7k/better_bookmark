import { CloudClient } from "chromadb";
import dotenv from "dotenv";
import { logger } from "utils/logger";
import chalk from "chalk";

dotenv.config();

if (!process.env.CHROMA_API_KEY) {
  throw new Error("CHROMA_API_KEY is not set in the environment");
}

if (!process.env.CHROMA_TENANT) {
  throw new Error("CHROMA_TENANT is not set in the environment");
}

if (!process.env.CHROMA_DATABASE) {
  throw new Error("CHROMA_DATABASE is not set in the environment");
}

// CloudClient configuration for Chroma Cloud
// CloudClient automatically connects to https://api.trychroma.com:8000
logger.info(
  `🔌 Connecting to ${chalk.cyan("Chroma Cloud")} - Tenant: ${chalk.yellow(
    process.env.CHROMA_TENANT
  )}, Database: ${chalk.yellow(process.env.CHROMA_DATABASE)}`
);

export const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DATABASE,
});
