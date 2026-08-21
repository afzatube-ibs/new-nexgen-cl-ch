# Phase 4.1 — Store API Gateway Platform Services (Slice 1.5)

**Verdict: Slice 1.5 complete and live-verified against the real backend. Not committed, not pushed, per this phase's own explicit instruction.**

---

## 0. Framing

This slice's own instruction was explicit that it is "not just another coding task" — it asked the Gateway to stop being an API proxy and become a genuine **Commerce Platform Gateway**: ten specific foundation services (Event Pipeline, Feature Flags, Preview, Personalization Context, Recommendation contracts, CDN/Cache platform, API Versioning, Request Tracing, Slug Readiness research, and a formal Plugin Architecture), every one of them explicitly "framework only" — no UI, no real destinations wired with live credentials, no hardcoded recommendation algorithm, no CMS/Landing/Checkout/Customer-Account/Reviews/Wishlist work of any kind. All ten were delivered to that same "real, honest, pluggable — never a disguised fake" bar this engagement has held throughout: every seam either does real work against real data (the trending-fallback recommendation engine queries real Catalog products; the SWR cache genuinely serves stale data while genuinely recomputing in the background; the warehouse destination genuinely writes to Redis) or is honestly inert and says so (`recently-viewed` returns `[]`, not fabricated data; `meta-capi`/`ga4`/`tiktok-events` report `isAvailable() === false` without real credentials, never a disguised fake success).

The self-check the instruction asked for — "would Shopify Plus/Stripe/Microsoft approve this?" — is answered concretely in §1 and §11: every extension point added this slice is a real contract with a real registry and at least one real (or honestly-absent) implementation, not a speculative interface with nothing behind it.

---

## 1. Architecture Changes

### 1.1 Gateway Plugin Architecture (build item 10) — the organizing change everything else sits inside

The Gateway was refactored from a flat `server.ts` wiring block into a formal plugin boundary model (`src/plugins/index.ts`), with each of Tracking (events), Personalization, Preview, Flags, Recommendations, and Caching declared as a `PluginBoundary` — `owns`, `dependsOn`, `requiredBy` — rather than left implicit in registration order. `server.ts` now reads as a sequence of named `register*Plugin(app, ...)` calls, each independently testable and independently removable. This is the change that makes the other nine build items additive instead of tangled: a future AI plugin or Marketplace plugin needs **no new plugin category**, only a new registration against the already-real contracts (`app.events`, `app.recommendations`, `app.destinations`, `app.flags`) — documented explicitly in the plugin manifest itself so this isn't a claim without evidence in the code.

### 1.2 Event Pipeline Foundation (build item 1)

`Browser → Gateway → EventPipeline → DestinationRegistry → [webhook | warehouse | meta-capi | ga4 | tiktok-events]`, deliberately kept a separate stream from the real backend's own `DomainEventBus` per `CDP_ARCHITECTURE.md` §1's own rule that behavioral telemetry must never share infrastructure with commerce-correctness events. Every destination implements one `DestinationContract` (`id`, `isAvailable()`, `send()`) — no destination-specific branching exists anywhere in the pipeline itself, satisfying the instruction's explicit "events must not contain destination-specific business logic" constraint. A Zod schema registry (`events/schemas.ts`) validates event shape per event name before anything is queued; a Redis-backed durable queue (`events/queue.ts`) with exponential backoff and a Dead Letter Queue means a destination outage degrades to retries, never silent data loss, mirroring the same graceful-degradation discipline already established for `lib/cacheStore.ts` in Slice 1.

### 1.3 Feature Flag Framework (build item 2)

Five real scopes (global/store/theme/preview/experiment) with an explicit precedence order (preview > store > theme > environment > rollout > default) and deterministic SHA-256-hash-based rollout-percentage bucketing — never `Math.random()`, so the same visitor gets the same bucket on every request without needing sticky state. Framework only, as instructed: no admin UI, a static starter registry (`flags/definitions.ts`) standing in for the future persistence layer.

### 1.4 Preview Framework (build item 3)

HMAC-SHA256 signed, time-bounded tokens (`preview/token.ts`) using the same discipline as Slice 1's own guest-session cookie, but a deliberately separate secret (`PREVIEW_TOKEN_SECRET`) — a leaked preview token should never be usable to impersonate a visitor's real identity, and vice versa. `POST /v1/preview/mint` + `GET /v1/preview/resolve` are real, live-verified endpoints; a tampered or expired token returns a real `410 Gone`, not a silent failure.

### 1.5 Personalization Context (build item 4)

One normalized `PersonalizationContext` per request, composing Slice 1's own guest identity with store/locale/currency plus new attribution (UTM/click-id extraction), referrer, device classification, and a derived acquisition channel — and, per the instruction's own forward-looking requirement, explicitly-null `future` fields (`customerId`, `segmentIds`, `loyaltyTier`, `aiProfile`) each documented in code with which specific backend gap blocks it. This is the "all downstream systems consume one normalized context" requirement made real: Recommendations and Events both read from the same `request.personalization`, not from separately re-derived state.

### 1.6 Recommendation API Foundation (build item 5)

`RecommendationEngineContract` + `RecommendationEngineRegistry` (first-registered engine that supports a given slot wins — the same Registry/Resolver shape the real backend's own `SearchEngineRegistry` already established, applied consistently rather than invented fresh). One real engine ships this slice: `trendingFallbackEngine`, an honestly-labeled (`meta.engine: 'trending-fallback'`), honestly-naive engine querying real Catalog products by recency — explicitly not collaborative filtering, and the code says so. `recently-viewed` returns `[]` rather than fabricating a plausible-looking response, because no view-history capability exists yet to back it.

### 1.7 CDN & Cache Platform (build item 6)

`lib/cacheHelper.ts` was rewritten for genuine stale-while-revalidate: a stored envelope now carries `storedAt`, and `serveCacheable` computes HIT/STALE/MISS from real elapsed time against `ttlSeconds` and a new `staleWhileRevalidateSeconds`. A STALE response is served immediately from cache while a background recompute fires exactly once (deduped via an in-process `inFlightRevalidations` set, so concurrent requests never trigger redundant upstream calls) — verified with fake timers in `test/unit/cacheHelperSwr.test.ts` and confirmed live against real Redis (§5). Cache Groups (`cache/groups.ts`) let related tags be purged together by name (`catalog`, `search`, `homepage`); a `CdnInvalidator` interface (`cache/cdnInvalidator.ts`) exists as a real seam with a logging no-op default — no real CDN is configured yet, and the code does not pretend one is.

### 1.8 Public API Versioning (build item 7)

`versioning/apiVersion.ts` establishes `CURRENT_VERSION = 'v1'` with per-version `deprecatedAt`/`sunsetAt` metadata and a `registerVersionedRoutes()` helper that auto-attaches `Deprecation`/`Sunset` headers once a version is marked deprecated — none is yet, so `v1` carries neither header today, which is itself the correct, verified behavior.

### 1.9 Request Tracing (build item 8)

Three distinct identifiers, kept intentionally separate rather than collapsed into one, because they answer three different questions: **Request ID** (Slice 1, one HTTP request only), **Trace ID** (new — spans a visitor's whole journey across multiple requests; accepted from a caller-supplied `X-Trace-Id` or minted fresh), and **Correlation ID** (already propagated to every backend call since Slice 1 as `X-Correlation-Id`). Every response now carries a structured `onResponse` log line (`{requestId, traceId, method, url, statusCode, durationMs}`).

### 1.10 Slug Readiness (build item 9)

`planning/architecture/GATEWAY_SLUG_READINESS.md` documents, without touching a single Commerce file, exactly what would need to change on the real backend (`ProductController`/`CategoryController`/`BrandController`'s `index()` filters gaining a `slug` exact-match parameter — Option A, recommended) versus a rejected riskier approach (overriding `getRouteKeyName()` — Option B). The Gateway itself now has a real, working seam for the day that lands: `backend/identifier.ts::resolveIdentifierKind()` classifies any incoming identifier as `uuid` or `slug`, and `assertUuidSupported()` in `routes/catalog.ts` gives a slug-shaped identifier today an honest, specific `501 upstream_unavailable` (pointing at the readiness doc) instead of a generic validation error — a deliberate, tested behavior change from Slice 1 (§4).

---

## 2. New Extension Points

| Contract | Registry | Real implementation(s) shipped | Future extension needs |
|---|---|---|---|
| `DestinationContract` | `DestinationRegistry` | webhook (real HTTP POST), warehouse (real Redis sink), meta-capi/ga4/tiktok-events (real contract shape, honestly unavailable) | new adapter file + one registration |
| `RecommendationEngineContract` | `RecommendationEngineRegistry` | trending-fallback (real Catalog data) | new engine file + one registration; no route changes |
| `FlagDefinition` | static registry (`flags/definitions.ts`) | 3 starter flags | new definition entry; persistence layer is a future slice |
| `PluginBoundary` | plugin manifest (`plugins/index.ts`) | 6 declared boundaries | new boundary declaration; **Future AI and Future Marketplace need no new category**, per §1.1 |
| `CdnInvalidator` | direct injection | logging no-op | real CDN client implementing the same interface |
| API version registry | `versioning/apiVersion.ts` | `v1` | add `v2` entry with `deprecatedAt` on `v1` — headers auto-attach, no route rewrite |

---

## 3. Files Created (Slice 1.5)

```
apps/store-api-gateway/src/
  backend/identifier.ts
  events/{types,schemas,validator,queue,pipeline}.ts
  destinations/{contract,registry}.ts
  destinations/adapters/{webhookDestination,warehouseDestination,stubDestination}.ts
  flags/{types,evaluator,definitions}.ts
  preview/{types,token}.ts
  personalization/{context,attribution,device}.ts
  recommendations/{contract,registry}.ts
  recommendations/engines/trendingFallbackEngine.ts
  cache/{groups,cdnInvalidator}.ts
  versioning/apiVersion.ts
  tracing/tracing.ts
  plugins/{tracing,events,flags,preview,personalization,recommendations,index}.ts
  routes/{events,recommendations,preview}.ts
planning/architecture/GATEWAY_SLUG_READINESS.md
apps/store-api-gateway/test/
  unit/flags/evaluator.test.ts, unit/preview/token.test.ts, unit/cacheHelperSwr.test.ts
  unit/events/{validator,pipeline}.test.ts
  unit/identifierAndPersonalization.test.ts
  integration/platformServices.test.ts
```

**Files substantially rewritten**: `lib/cacheHelper.ts` (real SWR), `routes/catalog.ts` (versioned prefix + slug-readiness seam), `server.ts` (full plugin wiring), `routes/health.ts` (platform-services diagnostics).

**Config changed**: `config/env.ts` (+8 new fields: 4 optional event-destination credentials, `PREVIEW_TOKEN_SECRET`/`_TTL_SECONDS`, `PUBLIC_BASE_URL`, plus a `preprocess` fix — §4), `.env`/`.env.example` updated to match.

---

## 4. Quality Gates

| Gate | Result |
|---|---|
| `npx tsc -p tsconfig.json` (typecheck, src+test) | ✅ Pass, 0 errors |
| `npx tsc -p tsconfig.build.json` (production build) | ✅ Pass, 0 errors — `dist/` contains every new module |
| `npx eslint src test --max-warnings=0` | ✅ Pass, 0 errors, 0 warnings |
| `npx vitest run` | ✅ **117/117 passing**, 18 files (60 Slice 1 tests + 57 new/changed Slice 1.5 tests) |
| Live verification against real backend | ✅ See §5 |

One genuine bug was found — **by live verification, not by the test suite**, which is exactly why this phase's own instruction requires live verification as a distinct gate from unit/integration tests:

- **`EVENTS_WEBHOOK_URL` (and the three sibling optional credential fields) rejected a real `.env` file's own "unset" convention.** `--env-file` loading `apps/store-api-gateway/.env`'s `EVENTS_WEBHOOK_URL=` line sets `process.env.EVENTS_WEBHOOK_URL` to an **empty string**, not `undefined`. `z.string().url().optional()` only treats `undefined` as absent — a defined-but-empty string still runs through `.url()` and fails, so the Gateway refused to boot at all (`Invalid Store API Gateway configuration: EVENTS_WEBHOOK_URL: Invalid url`). No test caught this because every test builds its `Env` object programmatically (`testEnv()`), never by parsing a real `.env` file's blank-value convention. **Fixed** in `config/env.ts` with a `z.preprocess(emptyStringToUndefined, ...)` wrapper applied to all four optional destination-credential fields, and a new regression test (`test/unit/env.test.ts`, "treats an empty string for an optional destination-credential field as unset, not invalid") added so this class of bug cannot silently regress. Re-verified: typecheck/lint/tests re-run clean (117/117), and the Gateway now boots correctly against the real `.env` file (§5).

---

## 5. Live Verification (real backend `http://127.0.0.1:8080`, real SQLite dev data; Gateway `http://127.0.0.1:4000`, real Redis)

- **Boot**: ✅ Gateway starts cleanly against its own real `.env` file (only after the fix in §4); `/health` reports `cache: up`, `eventQueue: up`, `platformServices: {availableDestinations: ["warehouse"], registeredDestinations: [5 destinations], registeredFlagCount: 3}`.
- **Slice 1 regression under the new plugin/middleware stack**: ✅ `GET /v1/categories` still returns real data (`Deletion Test Category`) with the correct envelope shape — confirms the new Personalization/Tracing/Flags hooks did not break the existing Catalog pipeline.
- **API Versioning**: ✅ `GET /v1/categories` → 200; `GET /categories` (unversioned) → 404, confirmed live.
- **Request Tracing**: ✅ a fresh `X-Trace-Id` is minted when none is supplied; a caller-supplied `X-Trace-Id: my-custom-trace-123` is echoed back unchanged.
- **Event Pipeline**: ✅ `POST /v1/events` with a valid `page_viewed` event returns `202` with `queuedFor: ["warehouse"]` (the only unconditionally-available destination with no real credentials configured); an unknown event name returns a structured `422`; `GET /v1/events/health` correctly reports 5 registered destinations vs 1 available.
- **Recommendation API**: ✅ `GET /v1/recommendations` lists all 5 real slot names; `GET /v1/recommendations/trending` returns the real "Premium Wireless Headphones" product with `meta.engine: "trending-fallback"`; `GET /v1/recommendations/recently-viewed` honestly returns `[]`; `GET /v1/recommendations/related` without `productId` returns a structured `422`.
- **Preview Framework**: ✅ `POST /v1/preview/mint` → real signed token → `GET /v1/preview/resolve?token=...` → `200` with the original `targetId` intact; a malformed token → `410`.
- **CDN & Cache Platform**: ✅ real Redis-backed cache confirmed: `ETag` present, `Cache-Control: public, max-age=120, stale-while-revalidate=600`, `X-Cache-Status: HIT` on repeat requests. (The STALE-window timing itself is covered by `test/unit/cacheHelperSwr.test.ts`'s fake-timer tests — §4 — since a live wait of hundreds of seconds is not a practical live-verification step; the live check here confirms the real Redis-backed HIT/MISS mechanics the timing logic sits on top of.)
- **Slug Readiness seam**: confirmed via the existing, now-passing `catalog.test.ts` integration test that a slug-shaped identifier gets a `501` pointing at `GATEWAY_SLUG_READINESS.md`, not a generic validation error (not independently re-verified live in this pass, since it requires no live backend state — pure Gateway-side classification logic, already integration-tested against the real route pipeline).

---

## 6. Performance

Smoke-level only, consistent with `PERFORMANCE_FOUNDATION.md`'s own no-numeric-SLA-without-a-real-build discipline:
- The existing Slice 1 performance smoke test (cached Category-A response under 50ms in-process) still passes unmodified under the new plugin stack — the Personalization/Tracing/Flags hooks added this slice did not measurably regress the hot cached-read path.
- Event ingestion (`POST /v1/events`) is fully decoupled from the request/response cycle: `ingest()` only enqueues (a fast, synchronous Redis `LPUSH`-equivalent) and returns `202` immediately; delivery to destinations happens on a background worker tick, never blocking the caller.
- SWR is a genuine performance feature, not just a freshness feature: a STALE response is served at cache-read speed (no upstream round-trip on the request path) while the recompute happens off the critical path — the same category of latency win Cloudflare's own `stale-while-revalidate` popularized.

---

## 7. Security

- `PREVIEW_TOKEN_SECRET` is a separate, dedicated secret from `GUEST_SESSION_SECRET` (§1.4) — a preview-token leak and a guest-identity leak have different blast radii and should be rotated independently; keeping them separate was a deliberate design decision, not an oversight.
- Preview tokens are HMAC-signed and time-bounded (`PREVIEW_TOKEN_TTL_SECONDS`, default 1 hour); a tampered payload or expired token is rejected with `410`, never silently accepted.
- Event ingestion validates every payload against a per-event-name Zod schema before it is queued — an attacker cannot inject an arbitrary shape into the pipeline or the destinations behind it.
- No event-destination credential is ever exposed to a caller; `GET /v1/events/health` reports only destination **names** and boolean availability, never token values.
- The `EVENTS_WEBHOOK_URL`-empty-string bug (§4) was a boot-time failure, not a security hole — worth naming here only because it is the kind of configuration-validation gap that, handled differently, could have silently disabled a security-relevant control instead of failing loudly. The fix preserves fail-loud behavior for genuinely malformed values while correctly tolerating "unset."

---

## 8. Scalability

- Every new stateful component (event queue, cache, flags evaluation) is either Redis-backed (event queue, cache — horizontally shareable across Gateway instances) or purely computational with no shared mutable state (flag bucketing is a pure hash function of visitor ID + flag key; personalization context is derived per-request from headers/cookies only) — nothing added this slice introduces a single-instance bottleneck or in-memory state that would break under multiple Gateway replicas.
- The Dead Letter Queue and exponential backoff mean a destination outage (e.g., a real Meta CAPI credential later added and then rate-limited) degrades gracefully under load rather than cascading into request-path failures — events keep queuing, delivery retries on its own schedule.
- `RecommendationEngineRegistry`'s first-supports-it-wins resolution and `DestinationRegistry`'s availability filtering are both O(number of registered entries) — at today's scale (single digits of destinations/engines) this is a non-issue, and the shape (a simple ordered list scan) will remain fine well past the 50,000-orders/day merchant scale named in the brief; it only becomes worth revisiting if the registry itself grows into the hundreds of entries.
- The Cache Groups mechanism purges by tag membership, not by scanning all keys — safe at scale under Redis, the same tag-based approach `lib/cacheStore.ts` already used in Slice 1.

---

## 9. Risks

1. **Only the `warehouse` destination is real-and-available today.** `webhook` is real but requires a configured `EVENTS_WEBHOOK_URL`; `meta-capi`/`ga4`/`tiktok-events` are honestly-inert stubs with real contract shapes but no live credentials. This is correct for a foundation slice, but means end-to-end delivery to any real ad platform has not yet been exercised against that platform's actual API — only against this Gateway's own contract.
2. **Carried over from Slice 1, unchanged**: the real backend's Search endpoint still fails on any non-empty `?q=` term in this SQLite dev environment (MySQL-specific `MATCH...AGAINST` syntax) — this affects the Recommendation engine's future ability to build a "related" or "recommended" slot on top of Search, once one is built; today's `trending-fallback` engine avoids Search entirely by querying Catalog directly, so it is unaffected.
3. **Slug lookup remains unimplemented on the real backend** (§1.10) — `assertUuidSupported()` correctly gives an honest `501` today, but every slug-shaped Storefront URL depends on the Option A backend change happening before any real Storefront can route by slug.
4. **The `EVENTS_WEBHOOK_URL`-empty-string class of bug (§4)** is now fixed for these four fields specifically; the same empty-string-vs-undefined gap could theoretically recur if a future optional URL/secret field is added to `env.ts` without routing it through the same `emptyStringToUndefined` preprocessor — worth a lint rule or code-review checklist item rather than a runtime risk today, since the fix pattern is now established and commented.
5. **`PREVIEW_TOKEN_SECRET`'s current value is a local-dev-only placeholder** (`.env`, explicitly named "please rotate before any real deploy" in its own value string) — carried over from how `GUEST_SESSION_SECRET` was already handled in Slice 1, not a new risk, but worth re-flagging alongside it before any real deployment.

---

## 10. Recommendations

1. **Before any Storefront work begins**: land the Option A backend change from `GATEWAY_SLUG_READINESS.md` (an additive `?slug=` filter on Catalog's `index()` endpoints) — it is small, non-breaking, and is the single biggest unblock for real Storefront URL routing.
2. **Before enabling any real ad-platform destination**: supply real `META_CAPI_ACCESS_TOKEN`/`GA4_API_SECRET`/`TIKTOK_EVENTS_ACCESS_TOKEN` values and add one live-fire integration test per platform (today's stub tests only prove the contract shape, not real delivery) — this is genuinely out of scope for a foundation slice, but should not be skipped silently later.
3. **Before production deployment**: rotate `PREVIEW_TOKEN_SECRET` and `GUEST_SESSION_SECRET` out of the checked-in `.env.example` placeholder pattern into real secret management, per `DEPLOYMENT:SECRETS_MANAGEMENT` (already flagged for `GUEST_SESSION_SECRET` in the Slice 1 report; now applies equally to the new secret).
4. **Re-verify Search against a real MySQL-backed environment** (carried over from Slice 1's own recommendation, still unresolved) before any Recommendation engine or Storefront feature is built that depends on non-empty-term search.
5. **Consider a small env-loading smoke test in CI** that boots the Gateway against a real `.env.example`-shaped file (not just programmatic `testEnv()` objects) — this is precisely the gap that let the §4 bug through unit/integration testing and only surfaced at live verification; a cheap CI step would catch this entire bug class automatically on every future config field addition.

---

## 11. Readiness Score

**8.5 / 10 — Foundation-complete, honestly scoped, one real bug found and fixed by live verification exactly as the process is designed to catch.**

- All ten required build items are real, working, and tested (not scaffolding-only) — full marks on scope and honesty.
- Quality gates are unambiguous: 117/117 tests, clean typecheck, clean lint, clean production build.
- The one genuine defect found (§4) was found by the live-verification step this instruction explicitly required, root-caused correctly, fixed at the source, and covered by a new regression test before being called done — the process worked as intended.
- Points held back, not for anything broken, but for what is explicitly still ahead: no real ad-platform destination has been exercised end-to-end (§9.1), the slug-lookup backend gap still blocks real Storefront routing (§9.3), and the Search/SQLite mismatch from Slice 1 remains unresolved and now has one more downstream consumer (Recommendations) that will eventually care about it.

---

## 12. Stop

No commit. No push. Waiting for Product Owner review, per this phase's own explicit instruction.
