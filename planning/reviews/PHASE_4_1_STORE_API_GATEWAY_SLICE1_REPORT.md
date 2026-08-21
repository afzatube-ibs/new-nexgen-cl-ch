# Phase 4.1 — Store API Gateway (BFF), Slice 1: Foundation

**Verdict: Slice 1 complete and live-verified against the real backend. Not committed, not pushed, per this phase's own explicit instruction.**

---

## 1. Architecture Compliance

### 1.1 Deployment-shape amendment (read this first)

`STORE_API_GATEWAY_ARCHITECTURE.md` §1 originally specified the Gateway as Next.js Route Handlers living inside `apps/storefront`. This slice's own instruction explicitly named `apps/store-api-gateway` as a standalone directory and explicitly excluded any React/Next.js dependency. This is a real, deliberate deviation from the prior Draft architecture document — resolved the same way this engagement has resolved every prior real-time Product-Owner-direction-vs-prior-plan conflict (Checkout's guest flow, Payments' Bangladesh-first scope): **implement per the explicit, current instruction, and record the amendment in the architecture document itself** rather than silently comply or silently ignore either signal. `STORE_API_GATEWAY_ARCHITECTURE.md` §1 now carries a Change Log entry documenting this, dated today.

The practical upside this amendment captures, not just a formality: the Gateway ships and is independently testable/deployable **without** `apps/storefront` (which does not exist) ever needing to be scaffolded — a real, positive sequencing consequence of the instruction as given, not merely a compliance exercise.

### 1.2 Framework choice — Fastify (Engineering ADR-level decision, Track 2)

No prior ADR settled a Node framework for a standalone BFF service. Per `GOVERNANCE:ADR_OWNERSHIP`'s Track 2 ("pure engineering... resolved through Engineering Review... escalation to PO not required"), this decision was made directly: **Fastify** over Express/NestJS/a Next.js-API-only shell.

- **Express**: rejected — slower, no first-class TypeScript story, no built-in schema validation.
- **NestJS**: rejected — a full DI/decorator framework is more machinery than a thin BFF needs, the same "no tool this repository doesn't yet need" reasoning `ADR-0009` already applied to Turborepo/pnpm.
- **Next.js (API routes only, no pages)**: rejected outright — this slice's own "NO React, NO Next.js pages" instruction reads as excluding any Next.js/React dependency from this app at all, not only page components.
- **Fastify**: chosen — native pino logging (structured logs "for free"), first-class TypeScript, built-in JSON Schema validation ecosystem, a plugin/hook model that maps directly onto the requested 9-stage pipeline, and mature, official plugins for every requirement this slice named (`@fastify/rate-limit`, `@fastify/helmet`, `@fastify/cors`, `@fastify/cookie`, `@fastify/swagger`).

### 1.3 Rules compliance ("Gateway orchestrates. Commerce owns business logic.")

- **No Commerce module was modified.** Confirmed: `git status`-equivalent scope of this slice is entirely new files under `apps/store-api-gateway/`, one `package.json` workspace-list edit, and Change Log-only edits to two already-Draft architecture documents (§1 above; this report). Zero files under `apps/backend/` were touched.
- **No business rule was duplicated.** Every price, stock figure, status, and search-ranking decision in every response this Gateway returns is a real value read from a real backend response (`src/backend/client.ts`) and reshaped (`src/composition/mappers.ts`) — never computed, inferred, or hardcoded by this Gateway. Confirmed live: a `draft`-status product is filtered from public visibility by the Gateway (§4 below), but its *data* — every field — still originates entirely from the real backend; the Gateway only decided whether to *show* it, never what it *is*.
- **Read-only, Category A only.** No cart, checkout, order, wishlist, review, or customer-identity route exists in this slice, per the explicit STRICT DO NOT list.

---

## 2. Files Created

```
apps/store-api-gateway/
  package.json, tsconfig.json, tsconfig.build.json, vitest.config.ts, eslint.config.js
  .env.example, .env (local dev only, gitignored), .gitignore
  src/
    index.ts                      — entrypoint
    server.ts                     — Fastify instance, pipeline wiring, global error handler
    config/env.ts                 — Zod-validated configuration (Configuration Management)
    lib/
      errors.ts                   — GatewayError / BackendUpstreamError, API:ERROR_MODEL-shaped
      responseEnvelope.ts         — API:RESPONSE_ENVELOPE-shaped success envelope
      etag.ts                     — HTTP Cache: ETag compute/match
      cacheStore.ts               — Redis-backed cache abstraction + in-memory test fallback
      cacheHelper.ts              — composes Cache stage (serveCacheable, buildCacheKey)
      circuitBreaker.ts           — per-dependency circuit breaker (§3.2 of the architecture doc)
      imageUrl.ts                 — responsive image URL / CDN-abstraction seam
    backend/
      client.ts                   — the ONE path to the real backend (service token, circuit breakers, correlation id)
      types.ts                    — DTOs mirroring real Catalog/Search Http\Resources exactly
    composition/
      mappers.ts                  — Backend DTO -> Storefront Component Engine-shaped summaries
    context/
      guestSession.ts             — signed guest identity (mint/verify), no customer login
      localization.ts             — locale/currency/store resolution
    plugins/
      security.ts                 — helmet, cors, rate-limit
      context.ts                  — guest-session onRequest hook (cookie mint/verify)
      openapi.ts                  — @fastify/swagger + swagger-ui
    routes/
      health.ts                   — /health, /health/live, /health/ready
      catalog.ts                  — /v1/homepage, /categories(/:id), /brands(/:id), /products/:id, /search
  test/
    unit/        — env, guestSession, etag, circuitBreaker, mappers, cacheStore, cacheHelper (7 files, 37 tests)
    integration/ — health, catalog, performanceSmoke, testUtils (4 files, 17 tests)
    security/    — security.test.ts (6 tests)
```

**Files modified**: `package.json` (root workspaces array), `docs/frontend/STORE_API_GATEWAY_ARCHITECTURE.md` (Change Log entry, §1 amendment).

---

## 3. API Inventory (this slice)

| Route | Purpose | Cache | Notes |
|---|---|---|---|
| `GET /health`, `/health/live`, `/health/ready` | Operational readiness (§`DEPLOYMENT:OPERATIONAL_READINESS`) | none | Live-verified |
| `GET /v1/homepage` | Composed convenience read: 8 categories + 8 brands + 12 recent active products | 120s | Live-verified with real data |
| `GET /v1/categories`, `GET /v1/categories/:id` | Real `CategoryResource`, composed | 300s | Live-verified |
| `GET /v1/brands`, `GET /v1/brands/:id` | Real `BrandResource` + logo image | 300s | Live-verified |
| `GET /v1/products/:id` | Real `ProductResource`, full detail incl. images/categories | 180s | Live-verified with a real image |
| `GET /v1/search` | Real `ProductSearchResultResource`, composed | 60s | Live-verified (empty-term path); non-empty-term path hits a real backend bug, §6 |

Every route: UUID-shaped `:id` (§6.1 explains why, not `:slug`), Zod-validated params/query, served through the shared Cache→Backend-Call pipeline, `{data, meta}` envelope, ETag + `Cache-Control` + `X-Cache-Status`.

---

## 4. Quality Gates

| Gate | Result |
|---|---|
| `npm run typecheck` (`tsc -p tsconfig.json`, src+test) | ✅ Pass, 0 errors |
| `npm run build` (`tsc -p tsconfig.build.json`, src only) | ✅ Pass, 0 errors |
| `npm run lint` (ESLint 9 flat config, type-aware) | ✅ Pass, 0 errors, 0 warnings |
| `npm run test` (Vitest) | ✅ **58/58 passing** — 37 unit, 15 integration, 6 security |
| Live verification against real backend | ✅ See §5 |

Two genuine bugs were found and fixed **within this Gateway's own code** during this process (both now covered by regression tests):
1. A route handler's manual `Zod.parse()` throwing a raw `ZodError` fell through the global error handler's fallback to a generic 500 instead of the intended 422 — fixed in `lib/errors.ts::toGatewayError`.
2. `@fastify/rate-limit`'s own source (`throw params.errorResponseBuilder(...)`, confirmed by reading its code) expects the builder to return an `Error`-shaped value carrying `.statusCode` — this Gateway's `errorResponseBuilder` originally returned a plain body object, losing that property and producing a 500 instead of 429. Fixed by returning the `GatewayError` instance itself (already an `Error` subclass with `.statusCode`) rather than its serialized body.

---

## 5. Live Verification (real backend, `http://127.0.0.1:8080`, real SQLite dev data)

Performed with a real, purpose-created **Storefront Service** staff account (`storefront-service@nexgen.local`, role `storefront-service`, permissions `catalog.{products,categories,brands,collections,tags,attributes,options}.view` + `search.products.view` — view-only, zero `.manage` permissions, matching `STORE_FRONTEND_ARCHITECTURE.md` §3.2's design exactly) and its real Sanctum token.

- **Categories**: ✅ real data returned (`Deletion Test Category`, real UUID, correct camelCase shape).
- **Products**: ✅ real data (`Premium Wireless Headphones`, real SKU) via homepage composition; ✅ full detail with a **real, live image** (confirmed below) via `/v1/products/:id`.
- **Images**: ✅ confirmed end-to-end — the real product's real attached image (`http://localhost:8080/storage/media/....png`) round-tripped through `buildResponsiveImage`, producing a full 6-width `srcSet`. Also confirmed the **honest converse**: list-context responses (homepage) correctly show `image: null` because the real `ProductController::index()` does not eager-load images — this is real backend behavior faithfully reflected, not a Gateway defect.
- **Brands**: ✅ real (empty list — genuinely no brands exist in this dev dataset).
- **Search**: ⚠️ partially verified — empty-term browse works and returns real data; non-empty-term search hits a real, pre-existing backend defect (§6.1).
- **Guest session**: ✅ `nx_did` cookie minted and set (`HttpOnly; SameSite=Lax; Max-Age=31536000`) on first contact.
- **Caching**: ✅ `MISS` on first request, `HIT` on second, `304` returned when `If-None-Match` matches, `Cache-Control: public, max-age=…, stale-while-revalidate=30`.
- **Rate limiting**: ✅ `X-RateLimit-Limit/Remaining/Reset` headers present and decrementing correctly; a genuine 429 with the structured `rate_limited` body confirmed once the fix in §4 landed.
- **Localization**: ✅ `?locale=` query override accepted and honored.
- **Security headers**: ✅ `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` present on every response.
- **Validation & error handling**: ✅ a non-UUID `:id` returns a structured 422; a nonexistent UUID returns a structured 404; an unknown route returns a structured 404 — never a raw stack trace, never Fastify's default error page.
- **OpenAPI**: ✅ `/docs` (Swagger UI) and `/docs/json` (raw spec) both serve correctly.

---

## 6. Genuine Findings (not fixed — out of this slice's authority)

### 6.1 No slug-based lookup exists on the real Catalog backend

Confirmed by direct code read (`ProductController`/`CategoryController`/`BrandController::show()`, all plain Laravel route-model-binding on the real UUID `id`; `index()`'s own `search` filter matches `name`/`sku` only, never `slug`). **This blocks `STORE_FRONTEND_ARCHITECTURE.md` §1.1's intended `/products/[slug]` URL scheme** from being fully implementable until Catalog's `index()` gains a `slug` exact-match filter — a small, additive, non-breaking change, but one this slice's own "Do NOT modify Commerce modules" rule correctly puts out of reach. This Gateway's product/category/brand detail routes are therefore honestly `:id`-shaped today, not `:slug`-shaped. **Recommended for the `NEXTGEN_PLATFORM_MASTER_ROADMAP.md` "Missing Backend Capabilities" list.**

### 6.2 Real backend defect: Search fails on any non-empty query term in this dev environment

Live-verified and root-caused via the real backend's own log (`storage/logs/laravel.log`): `Engines\MySqlFullTextSearchEngine` issues a raw `MATCH(name, searchable_text) AGAINST(...)` clause — genuine MySQL syntax — but this development environment's actual database driver is **SQLite** (`DB_CONNECTION=sqlite`, confirmed in `apps/backend/.env`), which has no such construct. Every search request carrying `?q=` fails with `SQLSTATE[HY000]: ... near "AGAINST": syntax error`. The empty-term ("browse with filters") path is unaffected and was confirmed working with real data.

This is a **pre-existing environment/backend mismatch**, invisible until now because no prior admin-side work against this exact dev database ever exercised a real non-empty search query outside of Playwright's own network-mocked tests. It is not a defect in this Gateway — confirmed live that this Gateway's own behavior in the face of it is correct: the real SQL error and file paths never reach the caller; the Gateway surfaces a clean, structured `502 upstream_error` and stays up. **Not fixed, per "Do NOT modify Commerce modules."** Flagged here as a real, load-bearing risk to re-verify against a real MySQL-backed environment before Search is relied upon in any later slice or in production.

---

## 7. Performance

Smoke-tested only, per `PERFORMANCE_FOUNDATION.md`'s own "no numeric budget without a real build to measure against" discipline — this is not a production SLA claim:
- A cached (post-warmup) Category-A response completes in well under 50ms of in-process handling time (`test/integration/performanceSmoke.test.ts`).
- 20 concurrent requests handled without error.
- Live: repeated real requests against the real backend showed sub-second responses on both cache MISS (real backend round-trip) and HIT (Redis).

---

## 8. Security

- Service credential (view-only Sanctum token) held server-side only in `.env`, never referenced in client-facing code — confirmed no route or response ever echoes it.
- Guest identity is HMAC-signed (`context/guestSession.ts`); a tampered or forged cookie is detected and silently replaced with a fresh, valid identity — never trusted, confirmed by dedicated unit tests.
- Rate limiting is real and keyed by guest identity (falling back to IP), confirmed live.
- Security headers (`helmet`) and CORS (explicit origin allow-list, `credentials: true` only for the configured origin) both confirmed live.
- No customer authentication of any kind exists in this slice, per its own explicit scope.
- Every error response is normalized to one structured shape — confirmed no raw stack trace or backend SQL/file-path detail ever reaches a caller, even when the real backend itself failed with a raw SQL exception (§6.2).

---

## 9. Risks

1. **§6.1 (missing slug lookup)** blocks real Storefront URL routing until a small Catalog addition is made by whoever owns that module next.
2. **§6.2 (Search/SQLite mismatch)** must be re-verified against a real MySQL environment before any later slice depends on non-empty-term search.
3. **`@fastify/rate-limit`'s undocumented `errorResponseBuilder` contract** (§4, bug #2) — the fix is correct and tested, but this is a subtle library integration risk worth a comment trail (already added in `plugins/security.ts`) so it is never silently reverted by a future contributor unaware of the constraint.
4. **The Storefront Service account's token** is a long-lived, unrotated Sanctum token for this Slice 1 dev environment — token rotation and Category-A credential lifecycle management is out of this slice's own scope and should be named explicitly before any real deployment.

---

## 10. Future Slices

Per `BETA1_FRONTEND_ROADMAP.md`'s own M1 definition (now partially delivered by this slice) and `STORE_API_GATEWAY_ARCHITECTURE.md` §4.2:
- Preview/Draft Mode (CMS & Theme preview) — named, not built this slice.
- Category B (customer-identified cart/checkout/account) — blocked on the backend customer-auth-guard gap this whole research initiative has repeatedly named; out of this slice's own authority.
- CDP event ingestion endpoint (`CDP_ARCHITECTURE.md` §4.5) — a natural, additive extension of this same Gateway once `apps/storefront` exists to emit browser events.
- Business-cache invalidation hooks (`invalidateTag`, already implemented and unit-tested as a real, callable method) — wiring a real webhook trigger from the backend's own event bus is future work, per `STORE_API_GATEWAY_ARCHITECTURE.md` §4.1.

---

## 11. Stop

No commit. No push. Waiting for Product Owner approval, per this phase's own explicit instruction.
