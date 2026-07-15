import { useState, useCallback, useEffect } from "react";
import axios, { AxiosResponse, CanceledError } from "axios";
import { create } from "zustand";

interface RefreshStore {
  shouldRefresh: boolean;
  lastRefreshTime: number;
  triggerRefresh: () => void;
  resetRefresh: () => void;
}

export const useRefreshStore = create<RefreshStore>((set) => ({
  shouldRefresh: false,
  lastRefreshTime: Date.now(),
  triggerRefresh: () =>
    set({ shouldRefresh: true, lastRefreshTime: Date.now() }),
  resetRefresh: () => set({ shouldRefresh: false }),
}));

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export interface BookmarkData {
  id: string;
  title: string;
  site: string;
  dateAdded: string;
  icon?: string | null;
  clickCount: number;
  pinned: boolean;
  description?: string | null;
  rank?: number;
  index?: number;
}

interface BookmarkApiResponse {
  [key: string]: BookmarkData;
}

interface UseBookmarksOptions {
  userDetails: { uid?: string } | null;
  userLoading: boolean;
}

interface UseBookmarksResult {
  bookmarks: BookmarkData[] | null;
  loading: boolean;
  error: string | null;
  errorType: "network" | "other" | null;
  fetchBookmarks: () => Promise<void>;
  refreshBookmarks: () => void;
}

export const useBookmarks = ({
  userDetails,
  userLoading,
}: UseBookmarksOptions): UseBookmarksResult => {
  const [bookmarks, setBookmarks] = useState<BookmarkData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"network" | "other" | null>(null);

  // Access the global refresh store
  const { shouldRefresh, resetRefresh } = useRefreshStore();

  const fetchBookmarks = useCallback(async () => {
    if (userLoading || !userDetails?.uid) {
      return;
    }

    setLoading(true);
    setError(null);
    setErrorType(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const UID = userDetails.uid;
      console.log("Fetching data for UID:", UID);

      const response: AxiosResponse<BookmarkApiResponse | BookmarkData[]> =
        await axios.get(`${BACKEND_URL}/api/v1/list/${UID}`, {
          signal: controller.signal,
          timeout: 20000,
        });

      console.log("Response:", response.data);
      clearTimeout(timeoutId);

      if (response.status !== 200) {
        throw new Error(`Failed to fetch data. Status: ${response.status}`);
      }

      setBookmarks(
        Array.isArray(response.data)
          ? response.data
          : Object.values(response.data)
      );
    } catch (error: unknown) {
      let errorMessage = "Failed to fetch data";
      let errorType: "network" | "other" = "other";

      if (axios.isAxiosError(error)) {
        if (error.code === "ERR_NETWORK") {
          errorMessage = "Network error: Please check your internet connection";
          errorType = "network";
        } else if (
          error.code === "ECONNABORTED" ||
          error instanceof CanceledError
        ) {
          errorMessage = "Request timed out: Server took too long to respond";
          errorType = "network";
        } else if (error.response) {
          errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error("Error fetching bookmark data:", error);
      setError(errorMessage);
      setErrorType(errorType);
      setBookmarks((currentData) => currentData || []);
    } finally {
      setLoading(false);
    }
  }, [userDetails, userLoading]);

  // Function to trigger a refresh
  const refreshBookmarks = useCallback(() => {
    useRefreshStore.getState().triggerRefresh();
  }, []);

  // Handle automatic refresh when shouldRefresh is true
  useEffect(() => {
    if (shouldRefresh) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch triggered by external refresh flag (zustand store)
      fetchBookmarks();
      resetRefresh(); // Reset the flag after fetching
    }
  }, [shouldRefresh, fetchBookmarks, resetRefresh]);

  // Initial fetch on mount and when user details change
  useEffect(() => {
    if (!userLoading && userDetails?.uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch once the authenticated user is known
      fetchBookmarks();
    }
  }, [userDetails?.uid, userLoading, fetchBookmarks]);

  return {
    bookmarks,
    loading,
    error,
    errorType,
    fetchBookmarks,
    refreshBookmarks,
  };
};
