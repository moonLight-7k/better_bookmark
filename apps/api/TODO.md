# BetterBookmark Backend - Production Readiness TODO

**Generated:** November 12, 2025  
**Status:** 🔴 NOT PRODUCTION READY  
**Estimated Time:** 2-3 weeks

---

## 🔴 WEEK 1 - CRITICAL SECURITY ISSUES (BLOCKERS)

### Authentication & Authorization
- [x] Create TODO.md documentation
- [x] **Implement Firebase Auth token verification middleware**
  - [x] Create `src/middleware/auth.ts`
  - [x] Verify Firebase ID tokens on protected routes
  - [x] Extract userId from verified token
  - [x] Add error handling for expired/invalid tokens
- [x] **Add userId authorization checks**
  - [x] Validate authenticated userId matches request userId
  - [x] Return 403 Forbidden for mismatched users
  - [x] Apply to all user-specific endpoints
- [x] **Apply auth middleware to all protected routes**
  - [x] `/api/v1/search/:query` - Require auth
  - [x] `/api/v1/upload` - Require auth
  - [x] `/api/v1/list/:userId` - Require auth + userId match
  - [x] `/api/v1/addBookmark` - Require auth

### Secrets Management
- [x] **Move hardcoded secrets to environment variables**
  - [x] Remove ChromaDB API key from `chroma.provider.ts`
  - [x] Add `CHROMA_API_KEY` to `.env`
  - [x] Add `CHROMA_TENANT` to `.env`
  - [x] Add `CHROMA_DATABASE` to `.env`
  - [x] Add `JWT_SECRET` to `.env` (if needed for custom tokens)
- [x] **Update .env.example file**
  - [x] Document all required environment variables
  - [x] Add descriptions for each variable
  - [x] Include example values (non-sensitive)

### CORS Configuration
- [x] **Restrict CORS to allowed origins**
  - [x] Add `ALLOWED_ORIGINS` environment variable
  - [x] Update CORS config in `server.ts`
  - [x] Remove wildcard `origin: "*"`
  - [ ] Test with production domain

### Rate Limiting
- [x] **Implement rate limiting per endpoint**
  - [x] Search endpoint: 100 requests/15min per user
  - [x] Upload endpoint: 10 requests/hour per user
  - [x] Add bookmark: 50 requests/hour per user
  - [x] Health check: No limit
- [x] **Add user-based rate limiting**
  - [x] Use authenticated userId as rate limit key
  - [x] Return 429 Too Many Requests with retry-after header
  - [x] Log rate limit violations

### Input Validation
- [x] **Install validation library (Zod)**
  - [x] Add zod to dependencies
  - [x] Create validation schemas in `src/validation/`
- [x] **Validate userId format**
  - [x] Create userId schema (Firebase UID format)
  - [x] Apply to all endpoints accepting userId
  - [x] Return 400 for invalid format
- [x] **Validate request body schemas**
  - [x] Search request validation
  - [x] Upload request validation
  - [x] Add bookmark request validation
- [x] **Sanitize file uploads**
  - [x] Validate file mimetype (only text/html)
  - [x] Validate file size limits
  - [ ] Scan for malicious content

---

## 🟠 WEEK 2 - HIGH PRIORITY DATA INTEGRITY

### Firebase Security
- [ ] **Configure Firebase Realtime Database Rules**
  - [ ] Users can only read their own data at `/users/{userId}`
  - [ ] Users can only write to their own path
  - [ ] Add validation rules for bookmark structure
  - [ ] Test rules with Firebase Emulator
- [ ] **Add server-side Firebase Admin SDK**
  - [ ] Install `firebase-admin`
  - [ ] Initialize with service account
  - [ ] Use admin SDK for server operations
  - [ ] Keep client SDK for auth verification only

### Cache Management
- [x] **Fix cache invalidation bugs**
  - [x] Clear `bookmarkCache` on upload (currently not cleared)
  - [x] Clear user-specific search cache entries
  - [x] Implement cache key prefix for user isolation
- [ ] **Add cache size limits to bookmarkCache**
  - [ ] Replace node-cache with LRU cache
  - [ ] Set max size (1000 entries)
  - [ ] Set TTL consistently (5 min)
- [ ] **Implement cache warming strategy**
  - [ ] Pre-cache popular queries per user
  - [ ] Background cache refresh before expiry

### Transaction Handling
- [ ] **Implement atomic operations for uploads**
  - [ ] Add rollback mechanism if ChromaDB fails
  - [ ] Restore Firebase data on failure
  - [ ] Add transaction logging
- [ ] **Handle partial failures gracefully**
  - [ ] Return partial success status
  - [ ] Log failed operations separately
  - [ ] Retry failed batches

### Logging & Monitoring
- [x] **Sanitize logs to remove sensitive data**
  - [x] Filter authorization headers from logs
  - [x] Redact user tokens in `logActions.ts`
  - [x] Remove request body from logs (or sanitize)
- [ ] **Implement structured logging**
  - [ ] Add request IDs for tracing
  - [x] Include userId in all logs
  - [ ] Add log levels appropriately
- [ ] **Add error tracking (Sentry/similar)**
  - [ ] Install Sentry SDK
  - [ ] Configure error reporting
  - [ ] Add user context to errors
  - [ ] Set up alerts for critical errors

### ChromaDB Collection Security
- [ ] **Validate collection names**
  - [ ] Prevent path traversal in collection names
  - [ ] Sanitize userId before using as collection name
  - [ ] Add collection name validation regex
- [ ] **Add collection access control**
  - [ ] Verify authenticated user owns collection
  - [ ] Prevent cross-user collection access
  - [ ] Log collection access attempts

---

## 🟡 WEEK 3 - MEDIUM PRIORITY PERFORMANCE & RELIABILITY

### File Upload Optimization
- [ ] **Switch to disk-based file storage**
  - [ ] Replace `multer.memoryStorage()` with `diskStorage`
  - [ ] Use `/tmp` directory for temp files
  - [ ] Clean up files after processing
  - [ ] Add file cleanup cron job
- [ ] **Implement streaming upload processing**
  - [ ] Process files as streams
  - [ ] Reduce memory footprint
  - [ ] Handle large files (>50MB)

### Metadata Crawling
- [ ] **Use parallel metadata fetching**
  - [ ] Already exists (`fetchMetadataBatch`) - implement everywhere
  - [ ] Configure concurrent request limit (10-20)
  - [ ] Add circuit breaker for failing URLs
- [ ] **Implement retry with backoff for failed URLs**
  - [ ] Retry failed metadata fetches
  - [ ] Store failed URLs for later retry
  - [ ] Add dead letter queue

### Batch Processing
- [ ] **Dynamic batch sizing based on user data**
  - [ ] Calculate batch size based on total documents
  - [ ] Adjust for API rate limits
  - [ ] Monitor and optimize batch performance
- [ ] **Add progress tracking for long operations**
  - [ ] WebSocket for real-time progress
  - [ ] Polling endpoint for upload status
  - [ ] Store operation status in Redis/Firebase

### Resource Management
- [ ] **Add user quotas**
  - [ ] Max bookmarks per user (10,000)
  - [ ] Max file size per upload (50MB)
  - [ ] Max searches per day (1,000)
  - [ ] Store quotas in Firebase/config
- [ ] **Implement graceful shutdown**
  - [ ] Handle SIGTERM/SIGINT signals
  - [ ] Close database connections
  - [ ] Complete in-flight requests
  - [ ] Drain connection pool

### Environment Configuration
- [ ] **Add environment validation on startup**
  - [ ] Check all required env vars exist
  - [ ] Fail fast if missing critical config
  - [ ] Log configuration errors clearly
- [ ] **Add configuration documentation**
  - [ ] Document all environment variables
  - [ ] Add deployment guide
  - [ ] Include troubleshooting section

---

## ⚪ FUTURE ENHANCEMENTS (Post-Launch)

### Performance
- [ ] **Implement Redis for distributed caching**
  - [ ] Replace in-memory caches with Redis
  - [ ] Enable multi-instance deployment
  - [ ] Add cache warming on startup
- [ ] **Add database connection pooling**
  - [ ] Configure Firebase connection pool
  - [ ] Configure ChromaDB connection pool
  - [ ] Monitor connection usage
- [ ] **Implement CDN for static content**
  - [ ] Cache bookmark metadata
  - [ ] Serve icons through CDN

### Observability
- [ ] **Add APM (Application Performance Monitoring)**
  - [ ] New Relic / Datadog integration
  - [ ] Track endpoint performance
  - [ ] Monitor database query times
- [ ] **Create health check endpoint enhancements**
  - [ ] Check Firebase connectivity
  - [ ] Check ChromaDB connectivity
  - [ ] Check OpenAI API status
  - [ ] Return detailed health status
- [ ] **Add metrics collection**
  - [ ] Prometheus metrics endpoint
  - [ ] Track request rates
  - [ ] Track error rates
  - [ ] Track embedding API costs

### Features
- [ ] **Implement bookmark deduplication**
  - [ ] Detect duplicate URLs
  - [ ] Merge duplicate bookmarks
  - [ ] Dedupe before embedding
- [ ] **Add bookmark tags autocomplete**
  - [ ] Aggregate popular tags
  - [ ] Suggest tags during add
- [ ] **Implement collaborative filtering**
  - [ ] Suggest bookmarks based on similar users
  - [ ] Implement privacy-preserving recommendations

### DevOps
- [ ] **Add automated testing**
  - [ ] Unit tests (Jest)
  - [ ] Integration tests
  - [ ] E2E tests
  - [ ] Test coverage >80%
- [ ] **Set up CI/CD pipeline**
  - [ ] GitHub Actions workflow
  - [ ] Automated testing on PR
  - [ ] Automated deployment
  - [ ] Rollback mechanism
- [ ] **Add database backup strategy**
  - [ ] Automated Firebase backups
  - [ ] ChromaDB collection backups
  - [ ] Disaster recovery plan
- [ ] **Implement blue-green deployment**
  - [ ] Zero-downtime deployments
  - [ ] Health check integration
  - [ ] Automatic rollback on failure

---

## 📊 PROGRESS TRACKING

### Overall Status
- **Total Tasks:** 85+
- **Completed:** 32
- **In Progress:** 0
- **Blocked:** 0

### Week 1 Progress: 22/25 ████████████████████░░░
### Week 2 Progress: 10/30 ██████░░░░░░░░░░░░░░░░
### Week 3 Progress: 0/20 ⬜⬜⬜⬜⬜
### Future Enhancements: 0/10 ⬜⬜⬜⬜⬜

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All Week 1 (Critical) tasks completed
- [ ] All Week 2 (High Priority) tasks completed
- [ ] Environment variables configured in production
- [ ] CORS configured for production domain
- [ ] Rate limiting tested under load
- [ ] Firebase Security Rules deployed
- [ ] Error tracking configured (Sentry)
- [ ] Monitoring and alerts set up
- [ ] Backup and recovery tested
- [ ] Load testing completed (1000+ concurrent users)
- [ ] Security audit performed
- [ ] Documentation updated
- [ ] Runbook created for on-call team

---

## 📝 NOTES

- **Authentication:** Using Firebase Auth tokens (ID tokens) passed in Authorization header
- **Multi-tenancy:** Collection names = userId for data isolation
- **Embedding costs:** Monitor OpenAI API usage per user
- **Scaling:** Current architecture supports ~1000 concurrent users per instance
- **Database:** Firebase Realtime DB for user data, ChromaDB for vector search

---

**Last Updated:** November 12, 2025  
**Next Review:** After Week 1 completion
