# BetterBookmark API Documentation

Base URL: `http://localhost:3003/api/v1`

## Table of Contents
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Health Check](#1-health-check)
  - [Search Bookmarks](#2-search-bookmarks)
  - [Upload Bookmarks File](#3-upload-bookmarks-file)
  - [Get All Bookmarks](#4-get-all-bookmarks)
  - [Add Single Bookmark](#5-add-single-bookmark)
- [Rate Limits](#rate-limits)
- [Error Responses](#error-responses)

---

## Authentication

All endpoints except `/health` require Firebase authentication.

**Headers:**
```
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

The backend validates the token and extracts the `userId` from Firebase Auth.

---

## Endpoints

### 1. Health Check

Check if the API server is running.

**Endpoint:** `GET /api/v1/health`

**Authentication:** Not required

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

### 2. Search Bookmarks

Perform semantic search on user's bookmarks using vector embeddings.

**Endpoint:** `POST /api/v1/search/:query`

**Authentication:** Required

**Rate Limit:** 100 requests per 15 minutes per user

**Compression:** Responses are automatically compressed (gzip/deflate) when client supports it

**Pagination:** Returns 24 results per page by default

**URL Parameters:**
- `query` (string, required): Search query text
  - Min length: 1 character
  - Max length: 500 characters
  - Automatically trimmed

**Request Body:**
```json
{
  "userId": "firebase_user_id_123",
  "page": 1,
  "limit": 24
}
```

**Body Parameters:**
| Field  | Type   | Required | Default | Description      | Validation                                             |
| ------ | ------ | -------- | ------- | ---------------- | ------------------------------------------------------ |
| userId | string | Yes      | -       | Firebase user ID | Alphanumeric, hyphens, underscores only. Max 128 chars |
| page   | number | No       | 1       | Page number      | Positive integer, min 1                                |
| limit  | number | No       | 24      | Results per page | Integer between 1 and 100                              |

**Success Response (200):**
```json
{
  "totalResults": 48,
  "totalPages": 2,
  "currentPage": 1,
  "pageSize": 24,
  "hasNextPage": true,
  "hasPreviousPage": false,
  "results": [
    {
      "title": "GitHub - Vector Embeddings Tutorial",
      "site": "https://github.com/example/vector-tutorial",
      "tags": ["tutorial", "ml", "embeddings"],
      "description": "Comprehensive guide to vector embeddings",
      "dateAdded": "2025-11-01T10:00:00.000Z",
      "relevanceScore": 0.92,
      "rank": 1
    },
    {
      "title": "OpenAI Documentation",
      "site": "https://platform.openai.com/docs",
      "tags": ["ai", "docs"],
      "description": "Official OpenAI API documentation",
      "dateAdded": "2025-10-15T14:30:00.000Z",
      "relevanceScore": 0.85,
      "rank": 2
    }
  ]
}
```

**No Results Response (200):**
```json
{
  "totalResults": 0,
  "totalPages": 0,
  "currentPage": 1,
  "pageSize": 24,
  "hasNextPage": false,
  "hasPreviousPage": false,
  "results": [],
  "message": "No bookmarks match the search query"
}
```

**Error Responses:**
- `400` - Invalid query or userId format
- `401` - Missing or invalid authentication token
- `403` - User not authorized (userId mismatch)
- `429` - Rate limit exceeded
- `500` - Internal server error

**Notes:**
- Uses LRU cache (5 min TTL, 1000 max items)
- Minimum relevance score: 0.77 (cosine similarity)
- Results sorted by relevance score (descending)

---

### 3. Upload Bookmarks File

Upload an HTML bookmarks file (exported from browser) or a ZIP file containing HTML bookmarks to crawl, embed, and store bookmarks.

**Endpoint:** `POST /api/v1/upload`

**Authentication:** Required

**Rate Limit:** 10 uploads per hour per user

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (file, required): HTML bookmarks file or ZIP file containing HTML
- `userId` (string, required): Firebase user ID

**File Requirements:**
| Property  | Requirement                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------- |
| MIME Type | `text/html`, `application/html`, `text/plain`, `application/zip`, or `application/x-zip-compressed` |
| Max Size  | 50 MB                                                                                               |
| Format    | Browser-exported bookmarks HTML or ZIP containing HTML file                                         |

**Success Response (200):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "bookmarksProcessed": 127
  }
}
```

**Error Responses:**

**400 - No file provided:**
```json
{
  "success": false,
  "message": "No file provided"
}
```

**400 - Invalid file type:**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Only HTML and ZIP files are allowed",
  "details": [...]
}
```

**400 - No HTML in ZIP:**
```json
{
  "success": false,
  "message": "No HTML files found in the zip archive"
}
```

**400 - No valid links found:**
```json
{
  "success": false,
  "message": "No valid links found in the file"
}
```

**400 - Collection initialization failed:**
```json
{
  "success": false,
  "message": "Failed to initialize collection"
}
```

**Other Error Codes:**
- `401` - Missing or invalid authentication token
- `403` - User not authorized
- `413` - File too large (>50MB)
- `429` - Rate limit exceeded
- `500` - Internal server error

**Process Flow:**
1. File uploaded and validated
2. If ZIP file, extract first HTML file from archive
3. HTML parsed to extract bookmark URLs
4. Metadata crawled from each URL (5s timeout, 100KB limit)
5. Bookmarks saved to Firebase Realtime DB
6. Bookmarks embedded and stored in ChromaDB (batches of 200)
7. User's bookmark cache cleared

**Notes:**
- ZIP files: Extracts first HTML file found (skips directories and hidden files)
- Overwrites existing bookmark cache
- Supports both full uploads and incremental updates
- ChromaDB collection named after userId

---

### 4. Get All Bookmarks

Retrieve all bookmarks for a user from Firebase.

**Endpoint:** `GET /api/v1/list/:userId`

**Authentication:** Required

**Compression:** Responses are automatically compressed (gzip/deflate) when client supports it

**Pagination:** Returns 40 results per page by default

**URL Parameters:**
- `userId` (string, required): Firebase user ID

**Query Parameters:**
| Field | Type   | Required | Default | Description      | Validation                |
| ----- | ------ | -------- | ------- | ---------------- | ------------------------- |
| page  | number | No       | 1       | Page number      | Positive integer, min 1   |
| limit | number | No       | 40      | Results per page | Integer between 1 and 100 |

**Success Response (200):**
```json
{
  "totalResults": 127,
  "totalPages": 4,
  "currentPage": 1,
  "pageSize": 40,
  "hasNextPage": true,
  "hasPreviousPage": false,
  "data": [
    {
      "index": 0,
      "rank": 1,
      "title": "GitHub",
      "icon": "https://github.com/favicon.ico",
      "description": "Where software is built",
      "site": "https://github.com",
      "id": "bookmark_12345",
      "tags": ["development", "git", "code"],
      "dateAdded": "2025-11-01T10:00:00.000Z",
      "clickCount": 42,
      "pinned": false
    },
    {
      "index": 1,
      "rank": 2,
      "title": "Stack Overflow",
      "icon": "https://stackoverflow.com/favicon.ico",
      "description": "Q&A for developers",
      "site": "https://stackoverflow.com",
      "id": "bookmark_67890",
      "tags": ["qa", "programming"],
      "dateAdded": "2025-10-28T15:30:00.000Z",
      "clickCount": 15,
      "pinned": true
    }
  ]
}
```

**Error Responses:**

**400 - Missing userId:**
```json
{
  "error": "User ID is required"
}
```

**404 - No bookmarks found:**
```json
{
  "error": "No bookmarks found",
  "message": "This user has no bookmarks yet"
}
```

**Other Error Codes:**
- `401` - Missing or invalid authentication token
- `403` - User not authorized (userId mismatch)
- `500` - Internal server error

**Notes:**
- Results cached for 5 minutes (300 seconds)
- Cache automatically cleared on upload or add bookmark
- Returns all bookmarks (no pagination)

---

### 5. Add Single Bookmark

Add a single bookmark by URL (crawls metadata automatically).

**Endpoint:** `POST /api/v1/addBookmark`

**Authentication:** Required

**Rate Limit:** 50 bookmarks per hour per user

**Request Body:**
```json
{
  "userId": "firebase_user_id_123",
  "link": "https://www.example.com/article"
}
```

**Body Parameters:**
| Field  | Type   | Required | Description      | Validation                                             |
| ------ | ------ | -------- | ---------------- | ------------------------------------------------------ |
| userId | string | Yes      | Firebase user ID | Alphanumeric, hyphens, underscores only. Max 128 chars |
| link   | string | Yes      | Bookmark URL     | Valid URL format. Max 2048 chars                       |

**Success Response (200):**
```json
{
  "message": "Bookmark added successfully",
  "bookmark": {
    "index": 127,
    "rank": 128,
    "title": "Example Article - Tech Blog",
    "icon": "https://www.example.com/favicon.ico",
    "description": "An insightful article about web development",
    "site": "https://www.example.com/article",
    "id": "bookmark_new_12345",
    "tags": ["tech", "web"],
    "dateAdded": "2025-11-12T10:45:00.000Z",
    "clickCount": 0,
    "pinned": false
  }
}
```

**Error Responses:**

**400 - Invalid URL or no data found:**
```json
{
  "error": "Invalid URL or no data found"
}
```

**400 - Validation error:**
```json
{
  "error": "Validation Error",
  "message": "Invalid URL format",
  "details": [...]
}
```

**Other Error Codes:**
- `401` - Missing or invalid authentication token
- `403` - User not authorized
- `429` - Rate limit exceeded (50 per hour)
- `500` - Internal server error

**Process Flow:**
1. URL validated
2. Metadata crawled from URL (5s timeout, 100KB limit)
3. Bookmark added to Firebase
4. Bookmark embedded and added to ChromaDB collection
5. User's bookmark cache cleared

**Notes:**
- Automatically extracts title, description, and favicon
- Uses Cheerio for HTML parsing with regex fallback
- User-Agent spoofed as `Mozilla/5.0 (compatible; MetadataBot/1.0)`
- Only processes `text/html` content types

---

## Rate Limits

| Endpoint     | Window     | Max Requests | Key          |
| ------------ | ---------- | ------------ | ------------ |
| Search       | 15 minutes | 100          | userId or IP |
| Upload       | 1 hour     | 10           | userId or IP |
| Add Bookmark | 1 hour     | 50           | userId or IP |

**Rate Limit Headers:**
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1699876800
```

**Rate Limit Error (429):**
```json
{
  "message": "Too many search requests, please try again later"
}
```

---

## Error Responses

### Validation Error (400)
```json
{
  "error": "Validation Error",
  "message": "Search query cannot be empty",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "Search query cannot be empty",
      "path": ["query"]
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token"
}
```

### Authorization Error (403)
```json
{
  "error": "Forbidden",
  "message": "User ID mismatch. You can only access your own data."
}
```

### Internal Server Error (500)
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

### CORS Error
```json
{
  "message": "Not allowed by CORS"
}
```

**Allowed Origins:**
- Configured via `ALLOWED_ORIGINS` environment variable
- Default: `https://app.betterbookmark.me`
- Use `*` for development (not recommended for production)

---

## Data Models

### BookmarkData
```typescript
{
  index: number;           // Position in list (0-based)
  rank?: number;          // Optional ranking
  title?: string;         // Max 500 chars
  icon?: string;          // Favicon URL, max 2048 chars
  description?: string;   // Max 2000 chars
  site?: string;          // Bookmark URL, max 2048 chars
  id?: string;            // Unique identifier, max 256 chars
  tags?: string[];        // Max 50 tags, each max 100 chars
  dateAdded?: string;     // ISO 8601 datetime
  clickCount?: number;    // Non-negative integer
  pinned?: boolean;       // Pinned status
}
```

### SearchResult
Same as `BookmarkData` plus:
```typescript
{
  score: number;  // Relevance score (0-1), min 0.77 returned
}
```

---

## Technical Details

### Vector Search
- **Embedding Model:** OpenAI text-embedding-ada-002
- **Vector DB:** ChromaDB with HNSW index
- **Distance Metric:** Cosine similarity
- **Minimum Score:** 0.77
- **Batch Size:** 200 documents per embed operation

### Caching Strategy
- **Search Cache:** LRU, 5 min TTL, 1000 max items
- **Bookmark List Cache:** Node-cache, 5 min TTL
- **Cache Key Format:** `bookmarks_{userId}`
- **Invalidation:** On upload or add bookmark

### Crawler Configuration
- **Timeout:** 5 seconds per URL
- **Max Response Size:** 100KB
- **User-Agent:** `Mozilla/5.0 (compatible; MetadataBot/1.0)`
- **Content-Type Filter:** `text/html` only
- **Parser:** Cheerio with regex fallback

### Retry Logic
All ChromaDB/OpenAI operations use exponential backoff:
- **Max Retries:** 3
- **Initial Delay:** 1000ms
- **Timeout:** 5000ms per operation

---

## Environment Variables

Required environment variables for API operation:

```bash
# Server
PORT=3003
ALLOWED_ORIGINS=https://app.betterbookmark.me

# ChromaDB
CHROMA_API_URL=http://localhost:8000
COLLECTION_NAME=bookmarks_test_05

# OpenAI
OPENAI_API_KEY=sk-...

# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
```

---

## Changelog

**Version 1.0** (2025-11-12)
- Initial API documentation
- 5 endpoints: health, search, upload, list, add bookmark
- Firebase authentication
- Rate limiting
- Vector search with ChromaDB
- Metadata crawling
