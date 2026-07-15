import { useState, useRef, useCallback, useEffect } from "react";
import axios, { AxiosError, AxiosResponse } from "axios";
import { SearchResult } from "@/types/search";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface UseSearchParams {
  userDetails: { uid?: string } | null;
}

interface UseSearchResult {
  executeSearch: (query: string) => Promise<void>;
  results: SearchResult[] | null;
  isLoading: boolean;
  error: string | null;
  clearResults: () => void;
}

interface SearchResponse {
  results: SearchResult[];
  status?: string;
}

export const useSearch = ({
  userDetails,
}: UseSearchParams): UseSearchResult => {
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  const executeSearch = useCallback(
    async (query: string): Promise<void> => {
      if (!query) {
        clearResults();
        return;
      }

      setIsLoading(true);
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;
      const UID = userDetails?.uid;

      if (!UID) {
        console.warn("User ID is missing for search request");
        setError("User authentication required. Please log in and try again.");
        setIsLoading(false);
        return;
      }

      try {
        const response: AxiosResponse<SearchResponse> = await axios.post(
          `${BACKEND_URL}/api/v1/search/${query}?userId=${encodeURIComponent(
            UID
          )}`,
          { userId: UID },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${UID || ""}`,
            },
            signal,
          }
        );

        console.log("Search results:", response.data.results);
        setResults(response.data.results || []);
      } catch (error: unknown) {
        if (axios.isCancel(error)) {
          // Request was cancelled, no need to set error state
          return;
        }

        console.error("Error fetching search results:", error);

        if (error instanceof AxiosError) {
          setError(`Failed to fetch search results: ${error.message}`);
        } else {
          setError("Failed to fetch search results. Please try again.");
        }
        setResults([]);
      } finally {
        if (
          abortControllerRef.current &&
          !abortControllerRef.current.signal.aborted
        ) {
          setIsLoading(false);
        }
      }
    },
    [userDetails, clearResults]
  );

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    executeSearch,
    results,
    isLoading,
    error,
    clearResults,
  };
};
