import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes - increased from 5 for better caching
      gcTime: 300 * 60 * 1000, // 30 minutes - increased from 10 for longer cache retention
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors (client errors)
        const axiosError = error as { response?: { status?: number } };
        if (
          axiosError?.response?.status &&
          axiosError.response.status >= 400 &&
          axiosError.response.status < 500
        ) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false, // Don't refetch if data exists in cache
    },
    mutations: {
      retry: false,
    },
  },
});
