import { Request, Response, NextFunction } from "express";
import chalk from "chalk";

/**
 * Format bytes to human-readable format
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Calculate request size
 */
const getRequestSize = (req: Request): number => {
  let size = 0;

  // Add headers size
  const headersString = JSON.stringify(req.headers);
  size += Buffer.byteLength(headersString, "utf8");

  // Add body size if present
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyString = JSON.stringify(req.body);
    size += Buffer.byteLength(bodyString, "utf8");
  }

  // Add file size if present (multer)
  if ((req as any).file) {
    size += (req as any).file.size || 0;
  }

  // Add URL and query params
  const urlString = req.originalUrl || req.url;
  size += Buffer.byteLength(urlString, "utf8");

  return size;
};

/**
 * Sanitize sensitive data from objects
 */
const sanitizeData = (data: any): any => {
  if (!data || typeof data !== "object") return data;

  const sanitized = { ...data };
  const sensitiveFields = [
    "password",
    "token",
    "apiKey",
    "secret",
    "authorization",
    "api_key",
    "access_token",
    "refresh_token",
  ];

  for (const key in sanitized) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return sanitized;
};

/**
 * Sanitize headers to remove sensitive information
 */
const sanitizeHeaders = (headers: any): any => {
  const sanitized = { ...headers };

  if (sanitized.authorization) {
    sanitized.authorization = "[REDACTED]";
  }
  if (sanitized.cookie) {
    sanitized.cookie = "[REDACTED]";
  }

  return sanitized;
};

const logAction = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestSize = getRequestSize(req);

  // Store original methods
  const originalSend = res.send;
  const originalJson = res.json;
  let responseSize = 0;

  // Override res.send to capture response size
  res.send = function (data: any): Response {
    if (data) {
      if (Buffer.isBuffer(data)) {
        responseSize = data.length;
      } else if (typeof data === "string") {
        responseSize = Buffer.byteLength(data, "utf8");
      } else {
        responseSize = Buffer.byteLength(JSON.stringify(data), "utf8");
      }
    }
    return originalSend.call(this, data);
  };

  // Override res.json to capture response size
  res.json = function (data: any): Response {
    if (data) {
      responseSize = Buffer.byteLength(JSON.stringify(data), "utf8");
    }
    return originalJson.call(this, data);
  };

  // Log when response is finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const compressionRatio =
      responseSize > 0 && res.getHeader("content-length")
        ? (
            (1 - Number(res.getHeader("content-length")) / responseSize) *
            100
          ).toFixed(1)
        : null;

    const action = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      userId: req.authenticatedUserId || "unauthenticated",
      requestSize: formatBytes(requestSize),
      responseSize: formatBytes(responseSize),
      ...(compressionRatio && {
        compressed: formatBytes(Number(res.getHeader("content-length"))),
        compressionRatio: `${compressionRatio}%`,
      }),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    // Color-coded logging based on status code
    const statusColor =
      res.statusCode >= 500
        ? chalk.red
        : res.statusCode >= 400
        ? chalk.yellow
        : res.statusCode >= 300
        ? chalk.cyan
        : chalk.green;

    console.log(
      chalk.blue("📊 Request:"),
      chalk.bold(action.method),
      action.path,
      statusColor(`[${action.statusCode}]`),
      chalk.gray(`${action.duration}`),
      chalk.magenta(`Req: ${action.requestSize}`),
      chalk.green(`Res: ${action.responseSize}`),
      action.compressionRatio
        ? chalk.yellow(`Compressed: ${action.compressionRatio}`)
        : ""
    );
  });

  next();
};

export default logAction;
