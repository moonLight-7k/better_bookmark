# betterBookmark Frontend - AI Coding Instructions

## Project Overview

Next.js 14+ (App Router) frontend for an AI-powered semantic bookmark manager. Uses Firebase Auth, TanStack Query for data management, and custom virtualized rendering for performance with large bookmark collections.

## Architecture & Data Flow

### Auth & Routing Flow

**Middleware-based auth** (`src/middleware.ts`) enforces cookie-based routing:

- Checks `authToken` and `onboardingComplete` cookies to redirect users
- Flow: Login → Onboarding (if first-time) → Main app
- Auth state managed in `AuthContext` with Firebase `onAuthStateChanged`
- Token refresh: Cookies auto-set with 7-day expiry, auth header injected via axios interceptor in `apiClient.ts`

### Dual State Management (Critical)

**Two patterns coexist** - understand when to use each:

1. **TanStack Query** (`src/hooks/useApiQuery.tsx`) - PRIMARY for new features:

   - Centralized hooks: `useBookmarks()`, `useSearchBookmarks()`, `useUploadBookmarks()`, `useAddBookmark()`
   - Query keys in `bookmarkKeys` object ensure cache consistency
   - Mutations auto-invalidate queries via `queryClient.invalidateQueries()`
   - Config: 5min stale time, no retry on 4xx, no refetch on window focus (`src/lib/queryClient.ts`)

2. **Zustand** (`useRefreshStore` in `src/hooks/useBookmarks.tsx`) - LEGACY:
   - Global refresh trigger: `useRefreshStore.getState().triggerRefresh()`
   - Still used by older components (will be migrated)
   - **When adding features**: Use TanStack Query mutations with `onSuccess` callbacks that invalidate queries

### Backend Integration

- API client: `src/lib/apiClient.ts` wraps axios with auth token injection and rate limit extraction
- Base URL: `NEXT_PUBLIC_BACKEND_URL` (default: `http://localhost:3001`)
- All endpoints prefixed `/api/v1/` - see `docs/API_LIST.md` for full list
- Type-safe responses defined in `src/types/api.ts` (e.g., `BookmarkData`, `SearchResponse`)

### Virtualized Rendering System

**Custom implementation** in `src/components/VirtualizedView.tsx`:

- Renders only visible items + buffer row (calculates `startRowIndex`/`endRowIndex`)
- Dynamic columns via `getGridColumns()` helper (`src/utils/helper.ts`) - responsive breakpoints: 2-6 columns
- Fixed item height: 200px for grid, configurable via props
- Window height: `window.innerHeight - 110px` (navbar offset) or custom values (e.g., Search uses `-320px`)

## Development Commands

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build
pnpm start        # Run production server
pnpm lint         # ESLint
```

## Code Conventions

### SSR Compatibility Pattern

**ALWAYS check window availability** before accessing browser APIs:

```typescript
export const getGridColumns = () => {
  if (typeof window === "undefined") return 4; // SSR fallback
  const width = window.innerWidth;
  // ...
};
```

### Component Architecture

- **Client components**: Mark with `"use client"` for interactivity (state, effects, browser APIs)
- **Server components**: Default for layouts, static content (e.g., `app/layout.tsx`)
- **Naming**: Components use PascalCase, hooks use camelCase with `use` prefix

### Styling with Tailwind

- Custom theme in `tailwind.config.ts` with CSS variable colors (`hsl(var(--background))`)
- Dark mode: Class-based switching (`darkMode: ["class"]`)
- Use `twMerge` from `tailwind-merge` for conditional classes
- shadcn/ui primitives in `src/components/ui/` - prefer these for new UI elements

### TypeScript Patterns

- API types in `src/types/api.ts` - single source of truth matching backend contracts
- `SearchResult` extends `BookmarkData` with `relevanceScore` field
- Component props: Define inline interfaces or export for reuse

## Common Workflows

### Adding a Bookmark Mutation

1. **Use TanStack Query pattern** (primary approach):

   ```typescript
   // In component
   const { mutate, isPending } = useAddBookmark();
   mutate(
     { url, userId },
     {
       onSuccess: () => {
         // Queries auto-invalidated via onSuccess callback in hook
       },
     }
   );
   ```

   Hook handles `invalidateQueries()` for bookmarks list and searches

2. **Legacy Zustand pattern** (only if modifying old code):
   - Call `useRefreshStore.getState().triggerRefresh()` after mutation
   - Components with `useBookmarks()` hook will detect change

### Working with Search

- Hook: `useSearchBookmarks({ userId, query, enabled })` from `src/hooks/useApiQuery.tsx`
- Returns `SearchResponse` with `totalResults`, `results[]`, optional `message`
- Results include `relevanceScore` - UI highlights items above threshold (0.7 in `Card.tsx`)
- Debouncing handled at component level (see `Search.tsx` implementation)

### Onboarding Flow

- New users land on `/onboarding` (enforced by middleware if `onboardingComplete` cookie missing)
- File upload via `useUploadBookmarks()` mutation with progress callback support
- On success, sets cookie and redirects to main app

## File Organization

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root with QueryProvider + AuthProvider
│   ├── page.tsx           # Main app (protected)
│   └── onboarding/        # First-time user flow
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── Main.tsx          # Primary bookmark view with virtualization
│   ├── Search.tsx        # Global search interface
│   └── Card.tsx          # Bookmark card with favicon, pin icon, relevance highlighting
├── hooks/
│   ├── useApiQuery.tsx   # TanStack Query hooks (PRIMARY)
│   └── useBookmarks.tsx  # Legacy Zustand hook
├── lib/
│   ├── apiClient.ts      # Axios wrapper with auth + rate limit handling
│   ├── queryClient.ts    # TanStack Query config
│   └── firebase.ts       # Firebase config
├── types/api.ts          # API response types
└── utils/
    ├── helper.ts         # getGridColumns() for responsive layout
    └── firebase/         # Direct Firebase DB operations
```

## Environment Variables

Required:

- `NEXT_PUBLIC_BACKEND_URL` - Backend API (default: `http://localhost:3001`)

Optional (Firebase):

- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_DATABASE_URL`

## Key Implementation Details

- **Bookmark sorting**: Always sort by `dateAdded` DESC (most recent first) - done in `useBookmarks` hook
- **Favicon handling**: Uses Google's favicon service `https://www.google.com/s2/favicons?domain=${link}&sz=128`
- **Error fallback**: Card component has `onError` handler for broken images, falls back to base64 icon or `/default.svg`
- **Pinned bookmarks**: Render `Pin` icon in top-left of cards where `pinned: true`
- **Middleware matcher**: Excludes `/api`, `/_next/*`, `favicon.ico`, `*.svg` from auth checks
- **Rate limiting**: Backend headers (`ratelimit-*`) extracted by apiClient interceptor, attached to responses as `_rateLimit`
