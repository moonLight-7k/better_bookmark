import { Request, Response, NextFunction } from "express";
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

declare global {
  namespace Express {
    interface Request {
      authenticatedUserId?: string;
      decodedToken?: DecodedIdToken;
    }
  }
}

let adminApp: App;

try {
  if (!getApps().length) {
    const serviceAccountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.replace(/^["']|["']$/g, ""); // Remove quotes if present

    if (serviceAccountPath) {
      logger.info(`Loading service account from: ${serviceAccountPath}`);
      adminApp = initializeApp({
        credential: cert(serviceAccountPath),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      logger.info("✅ Firebase Admin initialized with service account file");
    } else {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      };

      if (
        !serviceAccount.projectId ||
        !serviceAccount.clientEmail ||
        !serviceAccount.privateKey
      ) {
        throw new Error(
          "Firebase Admin credentials not properly configured. " +
            "Provide either FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID, " +
            "FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY"
        );
      }

      adminApp = initializeApp({
        credential: cert(serviceAccount as any),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      logger.info("✅ Firebase Admin initialized with environment variables");
    }
    logger.info("✅ Firebase Admin SDK initialized successfully");
  } else {
    adminApp = getApps()[0];
  }
} catch (error) {
  logger.error(`❌ Failed to initialize Firebase Admin SDK: ${error}`);
  throw error;
}

/**
 * Middleware to verify Firebase ID token and authenticate user
 *
 * Expects Authorization header in format: "Bearer <ID_TOKEN>"
 * Sets req.authenticatedUserId and req.decodedToken on success
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authorization header is required",
      });
      return;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authorization header must be in format: Bearer <token>",
      });
      return;
    }

    const idToken = parts[1];

    if (!idToken) {
      res.status(401).json({
        error: "Unauthorized",
        message: "ID token is missing",
      });
      return;
    }

    const decodedToken = await getAuth(adminApp).verifyIdToken(idToken, true);

    const userId = decodedToken.uid;

    if (!userId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token: user ID not found",
      });
      return;
    }

    req.authenticatedUserId = userId;
    req.decodedToken = decodedToken;

    logger.debug(`✅ User authenticated: ${userId}`);
    next();
  } catch (error: any) {
    if (error.code === "auth/id-token-expired") {
      res.status(401).json({
        error: "Unauthorized",
        message: "Token has expired. Please refresh your authentication.",
      });
      return;
    }

    if (error.code === "auth/id-token-revoked") {
      res.status(401).json({
        error: "Unauthorized",
        message: "Token has been revoked. Please re-authenticate.",
      });
      return;
    }

    if (error.code === "auth/argument-error") {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token format",
      });
      return;
    }

    logger.error(`❌ Authentication error: ${error.message}`, {
      code: error.code,
      path: req.path,
    });

    res.status(401).json({
      error: "Unauthorized",
      message: "Failed to authenticate token",
    });
    return;
  }
};

/**
 * Middleware to verify that the authenticated user matches the requested userId
 * Must be used AFTER authenticateUser middleware
 *
 * Checks userId from req.params.userId or req.body.userId
 */
export const authorizeUser = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authenticatedUserId = req.authenticatedUserId;

  if (!authenticatedUserId) {
    logger.error(
      "Authorization check failed: No authenticated user in request",
      {
        path: req.path,
        method: req.method,
      }
    );
    res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication middleware not applied",
    });
    return;
  }

  const requestedUserId = req.params.userId || req.body.userId;

  if (!requestedUserId) {
    logger.debug("Authorization check failed: No userId in request", {
      path: req.path,
      method: req.method,
    });
    res.status(400).json({
      error: "Bad Request",
      message: "User ID is required in request",
    });
    return;
  }

  if (authenticatedUserId !== requestedUserId) {
    // This is an expected authorization failure - log as warning without stack trace
    logger.warn(
      `Authorization denied: User ${authenticatedUserId} attempted to access resources for user ${requestedUserId}`,
      {
        authenticatedUserId,
        requestedUserId,
        path: req.path,
        method: req.method,
        ip: req.ip,
      }
    );

    res.status(403).json({
      error: "Forbidden",
      message: "You do not have permission to access this resource",
    });
    return;
  }

  logger.debug(`✅ User authorized: ${authenticatedUserId}`);
  next();
};

/**
 * Optional authentication middleware - allows both authenticated and unauthenticated requests
 * Sets req.authenticatedUserId if token is valid, but doesn't reject if missing
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      next();
      return;
    }

    const idToken = parts[1];
    const decodedToken = await getAuth(adminApp).verifyIdToken(idToken, true);

    req.authenticatedUserId = decodedToken.uid;
    req.decodedToken = decodedToken;

    logger.debug(`✅ Optional auth: User ${decodedToken.uid} authenticated`);
  } catch (error) {
    logger.debug(
      "Optional auth: Token verification failed, continuing without auth"
    );
  }

  next();
};

export { adminApp };
