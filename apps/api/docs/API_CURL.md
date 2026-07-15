# BetterBookmark API - cURL Examples

Base URL: `http://localhost:3003/api/v1`

## Table of Contents
- [Authentication](#authentication)
- [Health Check](#1-health-check)
- [Search Bookmarks](#2-search-bookmarks)
- [Upload Bookmarks File](#3-upload-bookmarks-file)
- [Get All Bookmarks](#4-get-all-bookmarks)
- [Add Single Bookmark](#5-add-single-bookmark)

---

## Authentication

All endpoints except `/health` require Firebase authentication token in the Authorization header.

```bash
# Set your Firebase ID token as an environment variable for convenience
export FIREBASE_TOKEN="your_firebase_id_token_here"
export USER_ID="your_firebase_user_id_here"
```

---

## 1. Health Check

Check if the API server is running.

**Basic Request:**
```bash
curl -X GET http://localhost:3003/api/v1/health
```

**With Headers:**
```bash
curl -X GET http://localhost:3003/api/v1/health \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## 2. Search Bookmarks

Perform semantic search on user's bookmarks.

**Note:** Responses are automatically compressed with gzip/deflate when the client supports it.

**Pagination:** Returns 24 results per page by default. Use `page` and `limit` in request body.

**Basic Search:**
```bash
curl -X POST "http://localhost:3003/api/v1/search/machine%20learning" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip, deflate" \
  -d '{
    "userId": "'${USER_ID}'"
  }'
```

**Search with Pagination:**
```bash
curl -X POST "http://localhost:3003/api/v1/search/machine%20learning" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip, deflate" \
  -d '{
    "userId": "'${USER_ID}'",
    "page": 2,
    "limit": 24
  }'
```

**Search with Spaces (URL Encoded):**
```bash
curl -X POST "http://localhost:3003/api/v1/search/vector%20embeddings%20tutorial" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip, deflate" \
  -d '{
    "userId": "'${USER_ID}'"
  }'
```

**Simple Search (No Variables):**
```bash
curl -X POST "http://localhost:3003/api/v1/search/react%20hooks" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip, deflate" \
  -d '{
    "userId": "your_user_id_123"
  }'
```

**Complex Search Query:**
```bash
curl -X POST "http://localhost:3003/api/v1/search/how%20to%20build%20REST%20API%20with%20TypeScript" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip, deflate" \
  -d '{
    "userId": "'${USER_ID}'"
  }'
```

**Expected Success Response:**
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
    }
  ]
}
```

**Expected No Results Response:**
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

---

## 3. Upload Bookmarks File

Upload an HTML bookmarks file (exported from browser) or a ZIP file containing HTML bookmarks.

**Supported File Types:**
- HTML files (`.html`, `.htm`)
- ZIP files (`.zip`) containing HTML bookmarks

**Upload HTML from File:**
```bash
curl -X POST http://localhost:3003/api/v1/upload \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -F "file=@/path/to/bookmarks.html" \
  -F "userId=${USER_ID}"
```

**Upload ZIP File (NEW):**
```bash
curl -X POST http://localhost:3003/api/v1/upload \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -F "file=@/path/to/bookmarks.zip" \
  -F "userId=${USER_ID}"
```

**Upload from Specific Path:**
```bash
curl -X POST http://localhost:3003/api/v1/upload \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -F "file=@./bookmarks_export.html" \
  -F "userId=${USER_ID}"
```

**Upload Without Variables:**
```bash
curl -X POST http://localhost:3003/api/v1/upload \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -F "file=@/home/user/Downloads/bookmarks.html" \
  -F "userId=your_user_id_123"
```

**Upload Chrome Bookmarks:**
```bash
curl -X POST http://localhost:3003/api/v1/upload \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -F "file=@${HOME}/Downloads/bookmarks_chrome.html" \
  -F "userId=${USER_ID}"
```

**Upload Firefox Bookmarks:**
```bash
curl -X POST http://localhost:3003/api/v1/upload \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -F "file=@${HOME}/Downloads/bookmarks_firefox.html" \
  -F "userId=${USER_ID}"
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "bookmarksProcessed": 127
  }
}
```

**Expected Error Responses:**

No file provided (400):
```json
{
  "success": false,
  "message": "No file provided"
}
```

Invalid file type (400):
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Only HTML and ZIP files are allowed"
}
```

No HTML files in ZIP (400):
```json
{
  "success": false,
  "message": "No HTML files found in the zip archive"
}
```

No valid links found (400):
```json
{
  "success": false,
  "message": "No valid links found in the file"
}
```

---

## 4. Get All Bookmarks

Retrieve all bookmarks for a user from Firebase.

**Note:** Responses are automatically compressed with gzip/deflate when the client supports it.

**Pagination:** Returns 40 results per page by default. Use `page` and `limit` query parameters.

**Basic Request:**
```bash
curl -X GET "http://localhost:3003/api/v1/list/${USER_ID}" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip, deflate"
```

**With Pagination:**
```bash
curl -X GET "http://localhost:3003/api/v1/list/${USER_ID}?page=2&limit=40" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip, deflate"
```

**Get First Page (Custom Limit):**
```bash
curl -X GET "http://localhost:3003/api/v1/list/${USER_ID}?page=1&limit=20" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip, deflate"
```

**Without Variables:**
```bash
curl -X GET "http://localhost:3003/api/v1/list/your_user_id_123" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip, deflate"
```

**With Pretty Print (jq):**
```bash
curl -X GET "http://localhost:3003/api/v1/list/${USER_ID}" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept-Encoding: gzip, deflate" | jq '.'
```

**Save to File:**
```bash
curl -X GET "http://localhost:3003/api/v1/list/${USER_ID}" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -o bookmarks_backup.json
```

**Expected Success Response:**
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

**Expected Error Responses:**

**Expected Error Responses:**

No bookmarks found (404):
```json
{
  "error": "No bookmarks found",
  "message": "This user has no bookmarks yet"
}
```

---

## 5. Add Single Bookmark

Add a single bookmark by URL (crawls metadata automatically).

**Basic Add Bookmark:**
```bash
curl -X POST http://localhost:3003/api/v1/addBookmark \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'${USER_ID}'",
    "link": "https://github.com/microsoft/TypeScript"
  }'
```

**Add GitHub Repository:**
```bash
curl -X POST http://localhost:3003/api/v1/addBookmark \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'${USER_ID}'",
    "link": "https://github.com/facebook/react"
  }'
```

**Add Documentation Site:**
```bash
curl -X POST http://localhost:3003/api/v1/addBookmark \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'${USER_ID}'",
    "link": "https://developer.mozilla.org/en-US/docs/Web/JavaScript"
  }'
```

**Add Blog Article:**
```bash
curl -X POST http://localhost:3003/api/v1/addBookmark \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'${USER_ID}'",
    "link": "https://martinfowler.com/articles/microservices.html"
  }'
```

**Without Variables:**
```bash
curl -X POST http://localhost:3003/api/v1/addBookmark \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your_user_id_123",
    "link": "https://stackoverflow.com"
  }'
```

**Expected Success Response:**
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

**Expected Error Responses:**

Invalid URL (400):
```json
{
  "error": "Invalid URL or no data found"
}
```

---

## Testing with Postman

### Import to Postman

You can import these cURL commands directly into Postman:

1. Open Postman
2. Click **Import** button
3. Select **Raw text**
4. Paste any cURL command from above
5. Click **Import**

### Environment Variables in Postman

Create a Postman environment with these variables:

```json
{
  "name": "BetterBookmark Dev",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:3003/api/v1",
      "enabled": true
    },
    {
      "key": "firebase_token",
      "value": "your_firebase_id_token_here",
      "enabled": true
    },
    {
      "key": "user_id",
      "value": "your_user_id_here",
      "enabled": true
    }
  ]
}
```

Then use in Postman like:
- URL: `{{base_url}}/search/query`
- Header: `Authorization: Bearer {{firebase_token}}`
- Body: `{"userId": "{{user_id}}"}`

---

## Rate Limit Testing

### Test Search Rate Limit (100 requests / 15 min)

```bash
# Test rate limiting with loop
for i in {1..101}; do
  echo "Request $i"
  curl -X POST "http://localhost:3003/api/v1/search/test" \
    -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"userId": "'${USER_ID}'"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

### Test Upload Rate Limit (10 requests / 1 hour)

```bash
# Test upload rate limiting
for i in {1..11}; do
  echo "Upload attempt $i"
  curl -X POST http://localhost:3003/api/v1/upload \
    -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
    -F "file=@./bookmarks.html" \
    -F "userId=${USER_ID}" \
    -w "\nStatus: %{http_code}\n"
  sleep 2
done
```

### Test Add Bookmark Rate Limit (50 requests / 1 hour)

```bash
# Test add bookmark rate limiting
for i in {1..51}; do
  echo "Add bookmark attempt $i"
  curl -X POST http://localhost:3003/api/v1/addBookmark \
    -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "'${USER_ID}'",
      "link": "https://example.com/page'${i}'"
    }' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

**Expected Rate Limit Response (429):**
```json
{
  "message": "Too many search requests, please try again later"
}
```

---

## Common Error Codes

| Code | Description           | Example                               |
| ---- | --------------------- | ------------------------------------- |
| 200  | Success               | Bookmark added successfully           |
| 400  | Bad Request           | Invalid userId format                 |
| 401  | Unauthorized          | Missing authentication token          |
| 403  | Forbidden             | User not authorized (userId mismatch) |
| 404  | Not Found             | No bookmarks found                    |
| 413  | Payload Too Large     | File size exceeds 50MB                |
| 429  | Too Many Requests     | Rate limit exceeded                   |
| 500  | Internal Server Error | Database connection failed            |

---

## Complete Example Workflow

```bash
# 1. Set environment variables
export FIREBASE_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
export USER_ID="firebase_user_abc123"

# 2. Check API health
curl -X GET http://localhost:3003/api/v1/health

# 3. Upload bookmarks file
curl -X POST http://localhost:3003/api/v1/upload \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -F "file=@./bookmarks.html" \
  -F "userId=${USER_ID}"

# 4. Get all bookmarks
curl -X GET "http://localhost:3003/api/v1/list/${USER_ID}" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json"

# 5. Search bookmarks
curl -X POST "http://localhost:3003/api/v1/search/typescript%20tutorial" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'${USER_ID}'"
  }'

# 6. Add a new bookmark
curl -X POST http://localhost:3003/api/v1/addBookmark \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'${USER_ID}'",
    "link": "https://www.typescriptlang.org/docs/"
  }'
```

---

## Debugging Tips

### View Response Headers
```bash
curl -i -X GET http://localhost:3003/api/v1/health
```

### Verbose Output
```bash
curl -v -X POST "http://localhost:3003/api/v1/search/test" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"userId": "'${USER_ID}'"}'
```

### Save Response to File
```bash
curl -X GET "http://localhost:3003/api/v1/list/${USER_ID}" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}" \
  -o response.json
```

### Timing Information
```bash
curl -w "@curl-format.txt" -o /dev/null -s \
  -X GET "http://localhost:3003/api/v1/list/${USER_ID}" \
  -H "Authorization: Bearer ${FIREBASE_TOKEN}"

# Create curl-format.txt with:
# time_namelookup:  %{time_namelookup}\n
# time_connect:  %{time_connect}\n
# time_starttransfer:  %{time_starttransfer}\n
# time_total:  %{time_total}\n
```

### Test with Invalid Auth
```bash
curl -X POST "http://localhost:3003/api/v1/search/test" \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "'${USER_ID}'"}'
```

---

## Production URL

For production deployment, replace the base URL:

```bash
# Development
BASE_URL="http://localhost:3003/api/v1"

# Production
BASE_URL="https://api.betterbookmark.me/api/v1"
```

Example production request:
```bash
curl -X GET https://api.betterbookmark.me/api/v1/health
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- File uploads use `multipart/form-data`
- All other requests use `application/json`
- Rate limits are per user (based on userId or IP if unauthenticated)
- Search queries are automatically URL-encoded
- ChromaDB collections are named after userId
- Minimum search relevance score is 0.77 (cosine similarity)
