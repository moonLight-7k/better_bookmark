import winston from "winston";

// Custom format to conditionally include stack traces
// Only logs stack traces for unexpected errors (500-level), not client errors (400-level)
const conditionalStackFormat = winston.format((info) => {
  // If there's an error object and it's a client error (not server error),
  // remove the stack trace to reduce log noise
  if (info.error instanceof Error && info.level === "warn") {
    delete info.stack;
  }
  return info;
});

// Configure the Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    conditionalStackFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: "backend-service" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're in development, also log to the console with more readable format
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export { logger };
