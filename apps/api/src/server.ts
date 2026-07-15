import express from "express";
import dotenv from "dotenv";
import chalk from "chalk";
import cors from "cors";
import multer from "multer";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";

import { healthController } from "controller/health/health.controller";
import { handleSearchController } from "controller/search/search.controller";
import { handleUploadController } from "controller/upload/upload.controller";
import logAction from "middleware/logActions";
import { handleGetAllBookmarksController } from "controller/bookmark/getAll.controller";
import addBookmarkController from "controller/bookmark/add.controller";
import { authenticateUser, authorizeUser } from "middleware/auth";
import { logger } from "utils/logger";

dotenv.config();

const app = express();
const PORT = process.env.PORT || "3003";

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["https://app.betterbookmark.me"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// app.use(
//   cors({
//     origin: "https://www.betterbookmark.me",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   })
// );

// Don't use express.json() globally - it interferes with multer
app.use(helmet());
app.use(morgan("combined"));
app.use(logAction);

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Multer error handler middleware
const handleMulterError = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      logger.error(`Multer unexpected field error: ${err.field || "unknown"}`);
      res.status(400).json({
        success: false,
        error: "File Upload Error",
        message: `Unexpected field '${
          err.field || "unknown"
        }'. Expected field name is 'file'`,
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: "File Upload Error",
      message: err.message,
    });
    return;
  }
  next(err);
};

// Rate limiters
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per user
  message: "Too many search requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.authenticatedUserId || req.ip || "anonymous",
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour per user
  message: "Too many upload requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.authenticatedUserId || req.ip || "anonymous",
});

const addBookmarkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 bookmarks per hour per user
  message: "Too many bookmark additions, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.authenticatedUserId || req.ip || "anonymous",
});

// Public routes (no authentication required)
app.get("/api/v1/health", healthController);

// Protected routes (authentication required)
app.post(
  "/api/v1/search/:query",
  compression({}), // Compress search responses
  express.json(),
  authenticateUser,
  authorizeUser,
  searchLimiter,
  handleSearchController
);

app.post(
  "/api/v1/upload",
  upload.single("file") as unknown as express.RequestHandler,
  handleMulterError,
  authenticateUser,
  authorizeUser,
  uploadLimiter,
  handleUploadController
);

app.get(
  "/api/v1/list/:userId",
  compression(), // Compress list responses
  authenticateUser,
  authorizeUser,
  handleGetAllBookmarksController
);

app.post(
  "/api/v1/addBookmark",
  express.json(),
  authenticateUser,
  authorizeUser,
  addBookmarkLimiter,
  addBookmarkController
);

app.listen(PORT, () => {
  console.log(chalk.gray("server running at:", PORT));
});
