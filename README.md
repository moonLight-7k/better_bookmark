# betterBookmark

AI-powered bookmark manager. Import your browser bookmarks, then find them by
meaning instead of exact keywords — semantic search over your saved links using
vector embeddings.

Live at [betterbookmark.me](https://www.betterbookmark.me).

## Monorepo layout

pnpm workspaces + [Turborepo](https://turborepo.com).

| Path       | What                                                                                  |
| ---------- | ------------------------------------------------------------------------------------- |
| `apps/web` | Next.js 16 / React 19 frontend — Tailwind v4, Radix UI, TanStack Query, Zustand        |
| `apps/api` | Express 5 / TypeScript backend — Firebase auth, ChromaDB vector store, OpenAI embeddings |

## How it works

1. Upload a browser bookmarks export (HTML/zip). The API crawls each link and
   generates OpenAI embeddings.
2. Embeddings are stored per-user in ChromaDB; bookmark metadata lives in Firebase.
3. Search sends your query as an embedding and returns the nearest bookmarks by
   vector similarity — so "that article about rust async" finds the page even if
   those words aren't in the title.

## Prerequisites

- Node.js 20+
- pnpm 11 (`corepack enable`)
- Firebase project (Auth + Realtime Database)
- ChromaDB instance ([Chroma Cloud](https://www.trychroma.com) or self-hosted)
- OpenAI API key

## Getting started

```bash
pnpm install

# fill in credentials (see .env.example in each app)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

pnpm dev        # runs web + api via turbo
```

- Web: http://localhost:3000
- API: http://localhost:3003 (base path `/api/v1`)

## Scripts

Run from the repo root; turbo fans them out to both apps.

| Command           | Does                          |
| ----------------- | ----------------------------- |
| `pnpm dev`        | Start web + api in watch mode |
| `pnpm build`      | Build all apps                |
| `pnpm start`      | Run built apps                |
| `pnpm lint`       | Lint all apps                 |
| `pnpm typecheck`  | Type-check all apps           |

## API

All routes require a Firebase ID token (`Authorization: Bearer <token>`) except
`/health`. Contract: [`docs/openapi.yaml`](docs/openapi.yaml). Endpoint reference
with curl examples: [`apps/api/docs/API_LIST.md`](apps/api/docs/API_LIST.md).

| Method | Endpoint                 | Purpose                        |
| ------ | ------------------------ | ------------------------------ |
| GET    | `/api/v1/health`         | Liveness check                 |
| POST   | `/api/v1/search/:query`  | Semantic search over bookmarks |
| POST   | `/api/v1/upload`         | Upload a bookmarks export      |
| GET    | `/api/v1/list/:userId`   | List all bookmarks             |
| POST   | `/api/v1/addBookmark`    | Add a single bookmark          |

## Docs

- [`docs/openapi.yaml`](docs/openapi.yaml) — OpenAPI 3.1 contract for the API
- [`docs/ingestion.md`](docs/ingestion.md) — how upload, URL parsing & data extraction work
