export interface SearchResult {
  // Required fields that should always be present
  id: string;
  title: string;
  site: string;
  dateAdded: string;

  // Optional fields
  icon?: string | null;
  clickCount: number;
  pinned: boolean;
  description?: string | null;
  rank?: number;
  index?: number;
  relevanceScore?: number;
  category: string[];
  tag: string[];
}

// Categorized search results
export interface CategorizedSearchResults {
  [category: string]: SearchResult[];
}

// API Response structure
export interface SearchApiResponse {
  results: SearchResult[];
  status: string;
  totalResults?: number;
  executionTime?: number;
}
