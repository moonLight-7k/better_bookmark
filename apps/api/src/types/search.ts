export interface BookmarkData {
  index: number;
  rank?: number;
  title?: string;
  icon?: string;
  description?: string;
  site?: string;
  id?: string;
  tags?: string[];
  dateAdded?: string;
  clickCount?: number;
  pinned?: boolean;
}

export interface SearchResult {
  score: number;
  index: number;
  rank?: number;
  title?: string;
  icon?: string;
  description?: string;
  site?: string;
  id?: string;
  tags?: string[];
  dateAdded?: string;
  clickCount?: number;
  pinned?: boolean;
}

export interface SearchOptions {
  maxResults?: number;
  metadataFields?: string[];
  minScore?: number;
  includeMetadata?: boolean;
  useCache?: boolean;
  orderBy?: string;
}
