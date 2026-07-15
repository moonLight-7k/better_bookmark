// src/background/background.ts
import { Bookmark, BookmarkSchema } from "../types/bookmark";

class BookmarkManager {
  private static instance: BookmarkManager;

  private constructor() {}

  public static getInstance(): BookmarkManager {
    if (!BookmarkManager.instance) {
      BookmarkManager.instance = new BookmarkManager();
    }
    return BookmarkManager.instance;
  }

  async exportBookmarks(): Promise<void> {
    try {
      const bookmarks = await this.getBookmarksTree();
      const validatedBookmarks = this.validateBookmarks(bookmarks);
      await this.saveToFile(validatedBookmarks);
    } catch (error) {
      console.error("Error exporting bookmarks:", error);
      throw error;
    }
  }

  private async getBookmarksTree(): Promise<
    chrome.bookmarks.BookmarkTreeNode[]
  > {
    return new Promise((resolve) => {
      chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        resolve(bookmarkTreeNodes);
      });
    });
  }

  private validateBookmarks(
    bookmarks: chrome.bookmarks.BookmarkTreeNode[]
  ): Bookmark[] {
    return bookmarks.map((bookmark) => {
      if (typeof bookmark.index === "undefined") {
        bookmark.index = -1;
      }
      return BookmarkSchema.parse(bookmark);
    });
  }

  private async saveToFile(bookmarks: Bookmark[]): Promise<void> {
    const bookmarksString = JSON.stringify(bookmarks, null, 2);

    // Create a data URL instead of using Blob
    const dataUrl = `data:application/json;base64,${btoa(unescape(encodeURIComponent(bookmarksString)))}`;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `bookmarks-${timestamp}.json`;

    try {
      await chrome.downloads.download({
        url: dataUrl,
        filename,
        saveAs: true,
      });
    } catch (error) {
      console.error("Download error:", error);
      throw error;
    }
  }
  async saveCurrentTab(): Promise<chrome.bookmarks.BookmarkTreeNode> {
    try {
      // Get current active tab
      const [tab] = await chrome?.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab || !tab.url || !tab.title) {
        throw new Error("No valid tab found");
      }

      // Create bookmark in default folder
      const bookmark = await chrome.bookmarks.create({
        title: tab.title,
        url: tab.url,
      });

      if (!bookmark) {
        throw new Error("Failed to create bookmark");
      }
      console.log("Bookmark created:", bookmark);
      return bookmark;
    } catch (error) {
      console.error("Error saving tab:", error);
      throw error;
    }
  }
}

// Initialize the manager
const bookmarkManager = BookmarkManager.getInstance();

// Set up message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "EXPORT_BOOKMARKS") {
    // Handle the export request
    bookmarkManager
      .exportBookmarks()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      });

    // Return true to indicate we'll send a response asynchronously
    return true;
  }

  if (request.type === "SAVE_CURRENT_TAB") {
    bookmarkManager
      .saveCurrentTab()
      .then((bookmark) => sendResponse({ success: true, bookmark }))
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
    return true;
  }
});
