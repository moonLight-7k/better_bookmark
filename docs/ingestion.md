# Ingestion: upload, URL parsing & data extraction

How a bookmark gets from a browser export (or a single URL) into Firebase and
the ChromaDB vector index. All paths live in `apps/api/src`.

There are two ingestion paths, and they behave differently:

| Path                | Entry                | Crawls live pages? | Source                                     |
| ------------------- | -------------------- | ------------------ | ------------------------------------------ |
| Bulk file upload    | `POST /api/v1/upload`| **No** — parse only | `utils/crawler.ts` → `crawlLinksFromFileRaw` |
| Single URL add      | `POST /api/v1/addBookmark` | **Yes**      | `utils/crawler.ts` → `crawlLinkFromUrl`      |

---

## 1. Bulk file upload

`POST /api/v1/upload` — `multipart/form-data` with fields `file` and `userId`.

### 1.1 Receive & validate — `controller/upload/upload.controller.ts`

1. Multer (`memoryStorage`, 50 MB cap — `server.ts:60`) buffers the file in RAM;
   no disk writes.
2. `uploadRequestSchema` validates `userId` (Firebase UID shape).
3. `fileUploadSchema` validates the file: content type must be one of
   `text/html`, `application/html`, `text/plain`, `application/zip`,
   `application/x-zip-compressed`; size ≤ 50 MB (`validation/schemas.ts:99`).

### 1.2 Unzip if needed — `extractHtmlFromZip` (`crawler.ts:12`)

If the upload is a zip, `AdmZip` scans entries and returns the **first**
`.html`/`.htm` file, skipping directories, dot-files, and `__MACOSX`. No HTML in
the archive → `400`.

### 1.3 Parse links — `crawlLinksFromFileRaw` (`crawler.ts:631`)

The HTML buffer is loaded with **cheerio** and every `<a>` is walked:

- Reads attributes `href`, `icon`, `add_date`, and the anchor's text.
- **Skips** an anchor when: no `href`, the `href` was already seen (dedup via a
  `Set`), or the scheme isn't `http:`/`https:`.
- Builds a `BookmarkData` record:

  ```ts
  {
    index, id: href, site: href, icon: icon || "",
    dateAdded: add_date, title: linkText || href,
    description: "", rank: index + 1,
    clickCount: 0, pinned: false, tags: ["all"],
  }
  ```

> **This path does no network I/O.** `title` comes from the anchor text and
> `description` is empty — the linked pages are never fetched. (A richer variant
> that fetches per-URL metadata, `crawlLinksFromFile` at `crawler.ts:302`,
> exists but is not wired into upload.)

### 1.4 Persist to Firebase — `db/utils.ts`

`updateDataInDatabase("users/{userId}/bookmarks", data)` writes the parsed array
to the Realtime Database.

### 1.5 Index into ChromaDB — `initializeCollection` (`service/upload/upload.service.ts:20`)

Called as `initializeCollection(userId, data)`, so **the Chroma collection is
named after the user** — one collection per user.

- **Embedded text** per bookmark comes from `cleanDocument`
  (`helper/search/search.helper.ts:67`): `title + description + site + tags`,
  lowercased. OpenAI (`text-embedding` via `chromadb`'s `OpenAIEmbeddingFunction`,
  `provider/openai.provider.ts`) turns this into a vector on upsert.
- **Metadata** stored alongside the vector: `site`, `title`, `tags` (comma
  joined), `dateAdded`, `description`, `rank`, `url`.
- **IDs** are positional: `bookmark_0`, `bookmark_1`, …
- Upserts run in **batches of 200** with retry (3 attempts, 60 s timeout,
  exponential backoff). A failed batch is logged and skipped, not fatal.

### 1.6 Respond

Bookmark cache for the user is cleared, then:

```json
{ "success": true, "message": "File uploaded successfully",
  "data": { "bookmarksProcessed": 342 } }
```

### Flow

```
file ─▶ validate ─▶ (unzip) ─▶ cheerio parse <a> ─▶ dedup/filter
     ─▶ Firebase (users/{uid}/bookmarks)
     ─▶ ChromaDB collection "{uid}"  (embed title+desc+site+tags, batches of 200)
```

---

## 2. Single URL add — live crawl

`POST /api/v1/addBookmark` with `{ userId, link }`.
Handler: `controller/bookmark/add.controller.ts` → `crawlLinkFromUrl`
(`crawler.ts:506`) → `fetchSingleUrlMetadata` (`crawler.ts:85`).

### 2.1 URL normalization & fetch

- If `link` has no `http` prefix, `https://` is prepended, then it's validated
  with the `URL` constructor.
- `fetch` with a **5 s** `AbortController` timeout, `User-Agent:
  MetadataBot/1.0`, `redirect: follow`.
- Bails unless the response is `2xx` **and** `Content-Type: text/html`.

### 2.2 Bounded read

The body is streamed and read up to **100 KB** (`MAX_BYTES = 100000`), then the
reader is cancelled. Large pages never fully download.

### 2.3 Regex extraction (not DOM)

For speed, title/description are pulled with regex rather than parsing the DOM:

- **Title**: `<title>` → `og:title` → `twitter:title`; falls back to the
  hostname.
- **Description**: `meta[name=description]` → `og:description` →
  `twitter:description`; falls back to empty.

The bookmark is saved via `saveDataToDatabase` and returned in the response.

### 2.4 Concurrency (batch helper)

The batch metadata fetcher `batchFetchMetadata` (`crawler.ts:195`) runs URLs in
waves of **20** with `Promise.allSettled`, so one slow or failing URL never
blocks the rest. (Used by the metadata-enriching file variant; the single-URL
add uses the same per-URL fetcher directly.)

---

## Known rough edges

Documenting current behavior, not endorsing it:

- Upload and single-URL add write to **different Firebase paths**
  (`users/{uid}/bookmarks` vs `{uid}/{id}`). `GET /list/:userId` reads the former.
- If Firebase succeeds but ChromaDB indexing fails, the upload returns `400`
  with Firebase already written — there's no rollback (noted in
  `upload.controller.ts:89`).
- `cleanDocument` concatenates `description` twice; harmless but redundant.

---

## Related

- API contract: [`openapi.yaml`](./openapi.yaml)
- Endpoint reference with curl examples: [`../apps/api/docs/API_LIST.md`](../apps/api/docs/API_LIST.md)
