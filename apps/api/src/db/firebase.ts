import { getDatabase } from "firebase-admin/database";
import { adminApp } from "../middleware/auth";

// Get database instance with full admin privileges
// The Admin SDK automatically bypasses all security rules
const db = getDatabase(adminApp);

export { db };
