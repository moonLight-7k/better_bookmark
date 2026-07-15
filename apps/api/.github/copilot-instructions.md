# BetterBookmark Backend - AI Coding Instructions

## Project Overview

BetterBookmark backend is a **semantic search API** for bookmark management using **vector embeddings** (ChromaDB + OpenAI). Users upload bookmark HTML files, which are crawled for metadata, vectorized, and stored per-user in ChromaDB collections for intelligent search.

**Tech Stack**: TypeScript, Express, Firebase Realtime DB, ChromaDB, OpenAI Embeddings, esbuild

## Architecture & Data Flow

### Core Components

1. **Firebase (User State)** - Stores raw bookmark data per user at `/users/{userId}/bookmarks`
2. **ChromaDB (Vector Search)** - Per-user collections (`{userId}`) containing embedded bookmarks
3. **OpenAI** - Generates embeddings for search queries and bookmark content
4. **Crawler** - Extracts metadata (title, description) from bookmark URLs in uploaded HTML files

### Critical Flow: Upload → Crawl → Store → Embed

```
POST /api/v1/upload (HTML file)
  → crawlLinksFromFileRaw() extracts URLs
  → fetchMetadata() scrapes title/description (5s timeout, 100KB limit)
  → updateDataInDatabase(userId, data) saves to Firebase
  → initializeCollection(userId, data) creates/updates ChromaDB collection
    → Batches of 200 documents embedded via OpenAI
    → Stored with metadata: {site, title, tags, description, rank, dateAdded}
```

### Search Flow

```
POST /api/v1/search/:query with {userId}
  → semanticSearch(query, userId)
  → Queries ChromaDB collection with OpenAI embedding
  → LRU cache (5min TTL, 1000 max items) for repeated queries
  → Returns results with cosine similarity scores (min 0.77 threshold)
```

## Build & Development Patterns

### Build System (esbuild)

- **Custom build.js** bundles TypeScript → `dist/server.js`
- External dependencies: `onnxruntime-node`, `sharp`, `cohere-ai`, `ollama` (for ChromaDB compatibility)
- **Dev workflow**: `pnpm dev` uses nodemon → rebuild + restart on file changes
- **Production**: `pnpm build && pnpm start`

### Module Resolution

- Uses `ESNext` modules with `baseUrl: "./src"` for absolute imports
- Import pattern: `import { x } from "service/...";` NOT `import { x } from "./service/...";`
- CommonJS output (`type: "commonjs"` in package.json) but ESNext source

## Key Conventions

### Error Handling & Retry Logic

All ChromaDB/OpenAI operations wrapped in `retryOperation()` helper:

```typescript
await retryOperation(() => client.getCollection(...), {
  retries: 3,
  timeout: 5000,
  initialDelay: 1000 // Exponential backoff
});
```

### Logging Standards

- Use **winston** logger from `helper/search/search.helper.ts` (NOT console.log)
- Color-coded with chalk: `logger.info()`, `logger.error()`, `logger.warn()`
- Performance tracking: `logPerformance('operation', startTime)` warns if >2s

### Environment Variables (Required)

```bash
# ChromaDB
CHROMA_API_URL=http://localhost:8000
COLLECTION_NAME=bookmarks_test_05

# OpenAI
OPENAI_API_KEY=sk-...

# Firebase (all required)
FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID,
FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID,
FIREBASE_APP_ID, FIREBASE_DATABASE_URL
```

### Data Models (src/types/search.ts)

- `BookmarkData`: Raw bookmark with site, title, tags[], description, rank, dateAdded
- `SearchResult`: Extends BookmarkData with `score` (0-1 normalized cosine similarity)
- `SearchOptions`: Configures search behavior (maxResults, minScore, useCache, metadataFields)

## Service Layer Patterns

### Provider Singletons

- `provider/chroma.provider.ts` exports `client` (ChromaClient instance)
- `provider/openai.provider.ts` exports `embeddingFunction` (ChromaDB OpenAI wrapper)
- Both throw on missing env vars - graceful degradation NOT used

### Collection Management

- **One collection per user** (collection name = userId)
- Collections auto-created on first upload via `getOrCreateCollection()`
- Uses `hnsw:space: "cosine"` for similarity metric
- Batch upserts (200 items) to avoid rate limits

### Crawler Optimization

- Cheerio-based HTML parsing with **regex fallback** for metadata extraction
- 5s timeout + 100KB response limit to prevent hanging on large pages
- User-Agent spoofing: `Mozilla/5.0 (compatible; MetadataBot/1.0)`
- Validates content-type before parsing (text/html only)

## API Response Patterns

### Success (200)

```json
{
  "totalResults": 10,
  "results": [{ "title": "...", "site": "...", "relevanceScore": 0.92 }]
}
```

### Client Errors (400)

```json
{ "error": "Bad Request", "message": "User ID is required" }
```

### Server Errors (500)

```json
{ "status": "error", "message": "Internal server error" }
```

## Testing & Debugging

- No test suite currently - manual testing via API endpoints
- Check logs: `logs/error.log` and `logs/combined.log` (5MB rotation, 5 files max)
- Dev logging: `LOG_LEVEL=debug pnpm dev` for verbose output
- ChromaDB health: `GET /api/v1/health` (basic check)

## Common Pitfalls

1. **CORS**: Currently allows `origin: "*"` (production config commented out)
2. **File uploads**: Multer limited to 50MB, memory storage (no disk persistence)
3. **Cache invalidation**: LRU cache NOT cleared on new uploads - stale results possible
4. **Collection names**: Must match userId exactly - typos break search
5. **Embedding costs**: OpenAI charges per token - batch operations minimize API calls

## Adding New Endpoints

1. Create controller in `src/controller/{feature}/{action}.controller.ts`
2. Implement service in `src/service/{feature}/{feature}.service.ts`
3. Register route in `src/server.ts` with middleware: `app.use(logAction)`
4. Use absolute imports: `import { x } from "service/...";`
5. Wrap external calls in `retryOperation()` with timeouts
