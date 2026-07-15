import { db } from "./firebase";

/**
 * Save data to a specified path in the Firebase Realtime Database.
 *
 * @param {string} path - The path in the database where the data should be saved.
 * @param {object} data - The data object to be saved.
 * @returns {Promise<boolean>} - Resolves true if the data was saved successfully, throws an error otherwise.
 * @throws {Error} - Throws an error if no path or data is provided, or if there is an issue during the saving process.
 */
export const saveDataToDatabase = async (path: string, data: object) => {
  if (!path) {
    throw new Error("path is required to save data");
  }
  if (!data) {
    throw new Error("data is required to save");
  }
  const sanitizedData = data;
  try {
    const dbRef = db.ref(path);
    await dbRef.set(sanitizedData);
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
export const getDataFromDatabase = async (path: string) => {
  if (!path) {
    throw new Error("path is required to get data");
  }
  try {
    const dbRef = db.ref(path);
    const snapshot = await dbRef.get();
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
export const updateDataInDatabase = async (path: string, data: object) => {
  if (!path) {
    throw new Error("path is required to save data!");
  }

  if (!data) {
    throw new Error("data is required to update!");
  }
  try {
    console.log(`[DEBUG] Updating database at path: ${path}`);
    console.log(`[DEBUG] Data keys: ${Object.keys(data).length} items`);
    const dbRef = db.ref(path);
    await dbRef.update({
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
export const deleteDataFromDatabase = async (path: string) => {
  if (!path) {
    throw new Error("path is required to delete data!");
  }
  try {
    const dbRef = db.ref(path);
    await dbRef.remove();
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
) => {
  const dbRef = db.ref(path);

  // Create a query with the provided field and value
  const dbQuery = dbRef.orderByChild(field).equalTo(value);

  try {
    // Fetch the data based on the query
    const snapshot = await dbQuery.get();
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
export const fetchLatestMessagesByType = async (
  userId: string,
  type: "bot" | "user",
  limit: number = 1
) => {
  try {
    const messagesRef = db.ref(`korra_messages/${userId}/messages`);

    // Query the latest messages by type and limit
    const typeQuery = messagesRef
      .orderByChild("type")
      .equalTo(type)
      .limitToLast(limit);

    const snapshot = await typeQuery.get();

    if (!snapshot.exists()) {
      return { success: true, data: [], message: `No ${type} messages found.` };
    }

    // Convert object to an array sorted by timestamp (if needed)
    const messagesArray = Object.values(snapshot.val()).sort(
      (a: any, b: any) => b.timestamp - a.timestamp
    );

    return { success: true, data: messagesArray };
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return { success: false, error: error.message };
  }
};

export const getUserById = async (userId: string) => {
  try {
    const dbRef = db.ref(`users/${userId}`);
    const snapshot = await dbRef.get();
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
