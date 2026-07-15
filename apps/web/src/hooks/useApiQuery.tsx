"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  UseQueryResult,
  UseMutationResult,
  UseInfiniteQueryResult,
  InfiniteData,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  BookmarkData,
  SearchResponse,
  ListBookmarksResponse,
  UploadResponse,
  AddBookmarkResponse,
  HealthCheckResponse,
} from "@/types/api";

// ============================================================================
// Query Keys - Centralized for consistency and type safety
// ============================================================================

export const bookmarkKeys = {
  all: ["bookmarks"] as const,
  lists: () => [...bookmarkKeys.all, "list"] as const,
  list: (userId: string, page?: number, limit?: number) =>
    [...bookmarkKeys.lists(), userId, page, limit] as const,
  searches: () => [...bookmarkKeys.all, "search"] as const,
  search: (userId: string, query: string, page?: number, limit?: number) =>
    [...bookmarkKeys.searches(), userId, query, page, limit] as const,
  health: () => ["health"] as const,
};

// ============================================================================
// Health Check Hook
// ============================================================================

export const useHealthCheck = () => {
  return useQuery<HealthCheckResponse, Error>({
    queryKey: bookmarkKeys.health(),
    queryFn: () => apiClient.healthCheck(),
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 1,
  });
};

// ============================================================================
// Get All Bookmarks Hook with Pagination
// ============================================================================

interface UseBookmarksOptions {
  userId?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export const useBookmarks = (
  options: UseBookmarksOptions = {}
): UseQueryResult<ListBookmarksResponse, Error> => {
  const { userId, page = 1, limit = 40, enabled = true } = options;

  return useQuery<ListBookmarksResponse, Error>({
    queryKey: userId
      ? bookmarkKeys.list(userId, page, limit)
      : ["bookmarks", "empty"],
    queryFn: async () => {
      if (!userId) {
        throw new Error("User ID is required");
      }
      return apiClient.getBookmarks(userId, page, limit);
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - matches backend cache
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// ============================================================================
// Search Bookmarks Hook with Pagination
// ============================================================================

interface UseSearchBookmarksOptions {
  userId?: string;
  query?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export const useSearchBookmarks = (
  options: UseSearchBookmarksOptions = {}
): UseQueryResult<SearchResponse, Error> => {
  const { userId, query, page = 1, limit = 24, enabled = true } = options;

  return useQuery<SearchResponse, Error>({
    queryKey:
      userId && query
        ? bookmarkKeys.search(userId, query, page, limit)
        : ["search", "empty"],
    queryFn: async () => {
      if (!userId) {
        throw new Error("User ID is required");
      }
      if (!query || query.trim().length === 0) {
        throw new Error("Search query is required");
      }
      return apiClient.searchBookmarks(query.trim(), userId, page, limit);
    },
    enabled: enabled && !!userId && !!query && query.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - matches backend LRU cache
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// ============================================================================
// Infinite Scroll: Get All Bookmarks
// ============================================================================

interface UseInfiniteBookmarksOptions {
  userId?: string;
  limit?: number;
  enabled?: boolean;
}

export const useInfiniteBookmarks = (
  options: UseInfiniteBookmarksOptions = {}
): UseInfiniteQueryResult<InfiniteData<ListBookmarksResponse>, Error> => {
  const { userId, limit = 40, enabled = true } = options;

  return useInfiniteQuery<ListBookmarksResponse, Error>({
    queryKey: userId
      ? [...bookmarkKeys.lists(), userId, "infinite", limit]
      : ["bookmarks", "empty"],
    queryFn: async ({ pageParam = 1 }) => {
      if (!userId) {
        throw new Error("User ID is required");
      }
      return apiClient.getBookmarks(userId, pageParam as number, limit);
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.currentPage + 1 : undefined;
    },
    getPreviousPageParam: (firstPage) => {
      return firstPage.hasPreviousPage ? firstPage.currentPage - 1 : undefined;
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    initialPageParam: 1,
  });
};

// ============================================================================
// Infinite Scroll: Search Bookmarks
// ============================================================================

interface UseInfiniteSearchBookmarksOptions {
  userId?: string;
  query?: string;
  limit?: number;
  enabled?: boolean;
}

export const useInfiniteSearchBookmarks = (
  options: UseInfiniteSearchBookmarksOptions = {}
): UseInfiniteQueryResult<InfiniteData<SearchResponse>, Error> => {
  const { userId, query, limit = 24, enabled = true } = options;

  return useInfiniteQuery<SearchResponse, Error>({
    queryKey:
      userId && query
        ? [...bookmarkKeys.searches(), userId, query, "infinite", limit]
        : ["search", "empty"],
    queryFn: async ({ pageParam = 1 }) => {
      if (!userId) {
        throw new Error("User ID is required");
      }
      if (!query || query.trim().length === 0) {
        throw new Error("Search query is required");
      }
      return apiClient.searchBookmarks(
        query.trim(),
        userId,
        pageParam as number,
        limit
      );
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.currentPage + 1 : undefined;
    },
    getPreviousPageParam: (firstPage) => {
      return firstPage.hasPreviousPage ? firstPage.currentPage - 1 : undefined;
    },
    enabled: enabled && !!userId && !!query && query.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    initialPageParam: 1,
  });
};

// ============================================================================
// Upload Bookmarks Hook
// ============================================================================

interface UploadBookmarksVariables {
  file: File;
  userId: string;
  onProgress?: (progress: number) => void;
  compress?: boolean; // Optional compression flag, defaults to true in apiClient
}

export const useUploadBookmarks = (): UseMutationResult<
  UploadResponse,
  Error,
  UploadBookmarksVariables
> => {
  const queryClient = useQueryClient();

  return useMutation<UploadResponse, Error, UploadBookmarksVariables>({
    mutationFn: async ({ file, userId, onProgress, compress = true }) => {
      return apiClient.uploadBookmarks(file, userId, onProgress, compress);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch bookmarks after successful upload
      queryClient.invalidateQueries({
        queryKey: bookmarkKeys.list(variables.userId),
      });
      // Also invalidate all search results
      queryClient.invalidateQueries({
        queryKey: bookmarkKeys.searches(),
      });
    },
  });
};

// ============================================================================
// Add Single Bookmark Hook
// ============================================================================

interface AddBookmarkVariables {
  userId: string;
  link: string;
}

interface AddBookmarkContext {
  previousBookmarks?: BookmarkData[];
}

export const useAddBookmark = (): UseMutationResult<
  AddBookmarkResponse,
  Error,
  AddBookmarkVariables,
  AddBookmarkContext
> => {
  const queryClient = useQueryClient();

  return useMutation<
    AddBookmarkResponse,
    Error,
    AddBookmarkVariables,
    AddBookmarkContext
  >({
    mutationFn: async ({ userId, link }) => {
      return apiClient.addBookmark(userId, link);
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid optimistic update being overwritten
      await queryClient.cancelQueries({
        queryKey: bookmarkKeys.list(variables.userId),
      });

      // Snapshot the previous value
      const previousBookmarks = queryClient.getQueryData<BookmarkData[]>(
        bookmarkKeys.list(variables.userId)
      );

      // Optimistically update to the new value (optional)
      // This could be enhanced with a temporary bookmark while crawling
      // queryClient.setQueryData(
      //   bookmarkKeys.list(variables.userId),
      //   (old: BookmarkData[] | undefined) => {
      //     if (!old) return old;
      //     return [{ ...tempBookmark }, ...old];
      //   }
      // );

      // Return context with the snapshotted value
      return { previousBookmarks };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context-value from onMutate
      if (context?.previousBookmarks) {
        queryClient.setQueryData(
          bookmarkKeys.list(variables.userId),
          context.previousBookmarks
        );
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch bookmarks after successful addition
      queryClient.invalidateQueries({
        queryKey: bookmarkKeys.list(variables.userId),
      });
      // Also invalidate search results
      queryClient.invalidateQueries({
        queryKey: bookmarkKeys.searches(),
      });
    },
  });
};

// ============================================================================
// Helper Hook: Prefetch Bookmarks
// ============================================================================

export const usePrefetchBookmarks = () => {
  const queryClient = useQueryClient();

  return (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: bookmarkKeys.list(userId),
      queryFn: () => apiClient.getBookmarks(userId),
      staleTime: 5 * 60 * 1000,
    });
  };
};

// ============================================================================
// Helper Hook: Invalidate Bookmarks Cache
// ============================================================================

export const useInvalidateBookmarks = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
    invalidateList: (userId: string) => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.list(userId) });
    },
    invalidateSearches: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.searches() });
    },
  };
};

// ============================================================================
// Helper Hook: Get Cached Data
// ============================================================================

export const useBookmarkCache = (userId?: string) => {
  const queryClient = useQueryClient();

  return {
    getBookmarks: () => {
      if (!userId) return null;
      return queryClient.getQueryData<BookmarkData[]>(
        bookmarkKeys.list(userId)
      );
    },
    getSearch: (query: string) => {
      if (!userId || !query) return null;
      return queryClient.getQueryData<SearchResponse>(
        bookmarkKeys.search(userId, query)
      );
    },
  };
};

// ============================================================================
// Export all hooks and utilities
// ============================================================================

export {
  // Types re-exported for convenience
  type BookmarkData,
  type SearchResponse,
  type UploadResponse,
  type AddBookmarkResponse,
  type HealthCheckResponse,
};
