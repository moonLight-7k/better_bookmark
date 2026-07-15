// API Type Definitions based on API_LIST.md

export interface BookmarkData {
  index?: number;
  rank?: number;
  title?: string;
  icon?: string;
  description?: string;
  site?: string;
  id?: string;
  tags?: string[]; // Backend uses tags array
  dateAdded?: string;
  clickCount?: number;
  pinned?: boolean;
}

export interface SearchResult extends BookmarkData {
  relevanceScore?: number;
  category?: string[];
  tag?: string[];
  tags?: string[];
}

export interface SearchResponse {
  totalResults: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  results: SearchResult[];
  message?: string;
}

export interface ListBookmarksResponse {
  totalResults: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  data: BookmarkData[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    bookmarksProcessed: number;
  };
  error?: string;
  details?: unknown;
}

export interface AddBookmarkResponse {
  message: string;
  bookmark: BookmarkData;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

export interface ApiError {
  error?: string;
  message: string;
  details?: unknown;
}

// Rate limit headers
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}
