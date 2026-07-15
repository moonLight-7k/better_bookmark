import React from "react";
import { useMutation } from "@tanstack/react-query";

export const Popup: React.FC = () => {
  const exportMutation = useMutation({
    mutationFn: async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "EXPORT_BOOKMARKS" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response?.success) {
            reject(new Error(response?.error || "Failed to export bookmarks"));
            return;
          }

          resolve(response);
        });
      });
    },
  });

  const saveTabMutation = useMutation({
    mutationFn: async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "SAVE_CURRENT_TAB" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response?.success) {
            reject(new Error(response?.error || "Failed to save tab"));
            return;
          }

          resolve(response);
        });
      });
    },
  });

  return (
    <div className="p-4 min-w-[300px]">
      <h1 className="text-xl font-bold mb-4">Bookmark Manager</h1>

      {/* Save Current Tab Button */}
      <button
        onClick={() => saveTabMutation.mutate()}
        disabled={saveTabMutation.isPending}
        className="w-full mb-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {/* <Bookmark className="w-4 h-4" /> */}
        {saveTabMutation.isPending ? "Saving..." : "Save Current Tab"}
      </button>

      {/* Export Bookmarks Button */}
      <button
        onClick={() => exportMutation.mutate()}
        disabled={exportMutation.isPending}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
      >
        {exportMutation.isPending ? "Exporting..." : "Export All Bookmarks"}
      </button>

      {/* Save Tab Status */}
      {saveTabMutation.isError && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
          {saveTabMutation.error instanceof Error
            ? saveTabMutation.error.message
            : "Failed to save tab"}
        </div>
      )}

      {saveTabMutation.isSuccess && (
        <div className="mt-4 p-2 bg-green-100 text-green-700 rounded">
          Tab saved successfully!
        </div>
      )}

      {/* Export Status */}
      {exportMutation.isError && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
          {exportMutation.error instanceof Error
            ? exportMutation.error.message
            : "Failed to export bookmarks"}
        </div>
      )}

      {exportMutation.isSuccess && (
        <div className="mt-4 p-2 bg-green-100 text-green-700 rounded">
          Bookmarks exported successfully!
        </div>
      )}
    </div>
  );
};
