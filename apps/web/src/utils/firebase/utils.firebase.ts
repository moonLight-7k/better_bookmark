import { db } from "@/lib/firebase";
import {
  ref,
  set,
  get,
  child,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";

/**
 * Save data to a specified path in the Firebase Realtime Database.
 *
 * @param {string} path - The path in the database where the data should be saved.
 * @param {object} data - The data object to be saved.
 * @returns {Promise<boolean>} - Resolves true if the data was saved successfully, throws an error otherwise.
 * @throws {Error} - Throws an error if no path or data is provided, or if there is an issue during the saving process.
 */
export const saveDataToDatabase = async (
  path: string,
  data: Record<string, unknown>
): Promise<boolean> => {
  if (!path) {
    throw new Error("path is required to save data");
  }
  if (!data) {
    throw new Error("data is required to save");
  }
  const sanitizedData = data;
  try {
    const dbRef = ref(db, path);
    await set(dbRef, sanitizedData);
    console.log(`[INFO] Data saved at ${path}!`);
    return true;
  } catch (error) {
    console.error("Error saving data:", error);
    throw error;
  }
};

/**
 * Fetch data from a specified path in the Firebase Realtime Database.
 *
 * @param {string} path - The path in the database from which to retrieve the data.
 * @returns {Promise<object | null>} - Resolves the fetched data object if it exists, or null if no data is found.
 * @throws {Error} - Throws an error if no path is provided, or if there is an issue during the retrieval process.
 */
export const getDataFromDatabase = async (
  path: string
): Promise<Record<string, unknown> | null> => {
  if (!path) {
    throw new Error("path is required to get data");
  }
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, path));
    if (snapshot.exists()) {
      const data = snapshot.val();
      // console.log("data fetched : ", data);
      return data;
    } else {
      console.log("No data available");
      return null;
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

/**
 * Update an existing user document in the Firebase Realtime Database.
 *
 * @param {string} path - The path in the database where the user data should be updated.
 * @param {object} data - The data object containing updated fields.
 * @returns {Promise<void>} - Resolves when the data has been updated successfully, throws an error otherwise.
 * @throws {Error} - Throws an error if no path or data is provided, or if there is an issue during the update process.
 */
export const updateDataInDatabase = async (
  path: string,
  data: Record<string, unknown>
): Promise<boolean> => {
  if (!path) {
    throw new Error("path is required to save data!");
  }

  if (!data) {
    throw new Error("data is required to update!");
  }
  try {
    const dbRef = ref(db, path);
    await update(dbRef, {
      ...data,
      // updatedAt: new Date().toISOString(),
    });
    console.log("User data updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating data:", error);
    throw error;
  }
};

/**
 * Delete data from a specified path in the Firebase Realtime Database.
 *
 * @param {string} path - The path in the database where the data should be deleted.
 * @returns {Promise<boolean>} - Resolves true if the data was deleted successfully, throws an error otherwise.
 * @throws {Error} - Throws an error if no path is provided, or if there is an issue during the deletion process.
 */
export const deleteDataFromDatabase = async (
  path: string
): Promise<boolean> => {
  if (!path) {
    throw new Error("path is required to delete data!");
  }
  try {
    const dbRef = ref(db, path);
    await remove(dbRef);
    console.log("User data deleted successfully.");
    return true;
  } catch (error) {
    console.error("Error deleting user data: ", error);
    throw new Error(`Error deleting user data: ${error}`);
  }
};

/**
 * A generic function to fetch data from Firebase Realtime Database based on a query.
 *
 * @param path - The path to the database node (e.g., 'clans').
 * @param field - The field name to query by (e.g., 'clanId' or 'clanName').
 * @param value - The value to search for in the specified field.
 *
 * @returns - Returns a Promise with the data or null if not found.
 */
export const getDataWithQuery = async (
  path: string,
  field: string,
  value: string | number
): Promise<Record<string, unknown> | null> => {
  const dbRef = ref(db, path);

  // Create a query with the provided field and value
  const dbQuery = query(dbRef, orderByChild(field), equalTo(value));

  try {
    // Fetch the data based on the query
    const snapshot = await get(dbQuery);
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.log(
        `No data found at path: ${path}, field: ${field}, value: ${value}`
      );
      return null;
    }
  } catch (error) {
    console.error(`Error fetching data from path: ${path}`, error);
    throw new Error("Error fetching data.");
  }
};

/**
 * Fetch the latest messages of a specific type (e.g., 'bot' or 'user') for a user with a limit.
 * @param userId - The user ID whose messages need to be fetched.
 * @param type - The message type ('bot' or 'user').
 * @param limit - Number of latest messages to retrieve.
 * @returns The latest messages filtered by type and limit.
 */

export const getUserById = async (
  userId: string
): Promise<Record<string, unknown> | null> => {
  try {
    const dbRef = ref(db, `users/${userId}`);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.log("No data available");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
};
