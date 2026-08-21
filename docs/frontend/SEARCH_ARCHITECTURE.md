# neXgen Core — Storefront Search Architecture

| Field | Value |
|---|---|
| **Status** | **Accepted** (retroactively ratified 2026-08-19 — this document's target architecture was already the real, working standard the Storefront's Search integration was built against; see `planning/reviews/EVIDENCE_BASED_PLATFORM_AUDIT.md` §1.3) |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-17 (ratified 2026-08-19) |
| **Builds on** | The real, already-built `MODULE:SEARCH` backend (`app/Domains/Commerce/Search/`, Commerce domain, Evolvable stability, confirmed this research pass), `STORE_FRONTEND_ARCHITECTURE.md` |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-19 | Status changed from Draft to Accepted. No technical content changed. | Repository Stabilization (Phase 1) — see `CUSTOMER_EXPERIENCE_ARCHITECTURE.md`'s own identically-reasoned Change Log entry for the full rationale. |

---

## 1. What Already Exists — Ground Truth, Not Assumption

Confirmed by direct code read (`Http/Requests/SearchProductsRequest.php`, `Engines/Support/SearchQuery.php`, `routes.php`): a real, working, staff-gated (`auth:sanctum` + `search.products.view`, matching `STORE_FRONTEND_ARCHITECTURE.md` §0's universal finding) `GET /search/products` endpoint, backed by MySQL `FULLTEXT` (`Engines\MySqlFullTextSearchEngine`), supporting: an optional free-text term, a single `brand_id` filter, sort by `relevance|name|published_at|created_at`, and pagination. Permission-aware result filtering (only `active` status, only `search`-visible products) is enforced server-side, never caller-supplied — a real, already-correct security property this document does not need to re-design.

Critically, the engine itself is **already pluggable**: `Engines\Contracts\SearchEngineContract` + `SearchEngineFactory`/`SearchEngineRegistry`/`SearchEngineResolver` is the exact same extensibility pattern this platform already uses for Payment gateways (`Gateways\Contracts\PaymentGatewayContract`) — "adding a new engine should require only: implement the contract, register it," per that pattern's own proven acceptance criterion. This document's entire recommendation is built on using that seam, not replacing the architecture around it.

**What does not exist today**: autocomplete, synonyms, typo tolerance, facets beyond `brand_id`, merchandising (pinning/boosting), recent/popular search tracking, and any customer-facing (non-staff) access to search at all — the same universal auth gap `STORE_FRONTEND_ARCHITECTURE.md` §0 already names applies here too.

---

## 2. Design: A New Engine Behind the Existing Contract, Not a New Module

**Recommendation: implement a new `SearchEngineContract` conformant engine** (a dedicated search service — Meilisearch, Typesense, or an Elasticsearch/OpenSearch-family engine are all realistic, license-appropriate candidates; the specific choice is an Engineering ADR-level decision this document does not make, consistent with `MODULE:PUBLIC_CONTRACT`'s "internal implementation may change freely" rule) delivering everything §3 needs, registered alongside `MySqlFullTextSearchEngine` in the existing `SearchEngineRegistry` — never a second Search module. This is a direct, deliberate application of `04_MODULE_ARCHITECTURE.md`'s own `MODULE:PUBLIC_CONTRACT` principle: the contract stays stable, the implementation swaps.

The `Support\SearchQuery`/`SearchResult` shapes need real, additive extension (facets, typo-tolerance hints, autocomplete-mode flag) — a genuine, elevated-justification change since Search is Evolvable, not Core (`MODULE:STABILITY` already permits this without the full Core-change process), but still a proposed contract change, not a silent one.

---

## 3. Capability Design

### 3.1 Autocomplete

A new, lightweight endpoint (`GET /search/suggest`, proposed) returning a bounded (≤10), fast (<100ms target, unverified until built per `TESTING:PERFORMANCE_TESTING`'s own evidence-based standard) list of product-name and category-name matches as the visitor types — a materially smaller, differently-shaped response than a full `search/products` result page, deliberately not reusing that endpoint's own pagination/sort machinery it doesn't need.

### 3.2 Synonyms & Typo Tolerance

Both are real, native capabilities of every realistic engine candidate named in §2 (not something this platform builds itself) — this document's contribution is the **merchant-facing configuration surface**: a `search_synonyms` table (`term`, `synonyms: string[]`) owned by `MODULE:SEARCH` itself, editable by a merchant through the admin (e.g. "sneakers" ↔ "trainers"), passed to the engine at index-build/query time. Typo tolerance is engine-native and requires no merchant configuration beyond a sensible default threshold.

### 3.3 Facets & Filters

Extends the real `brand_id` filter already in `SearchQuery` with: category, price range, and any Catalog `Attribute`/`Option` marked filterable (a new boolean flag on the real `Attribute`/`Option` models, `catalog.attributes.filterable` — the one small, named, additive Catalog touch-point this document requires, per the same "small, additive, named" allowance `THEME_ENGINE_ARCHITECTURE.md` §3 step 2 already used for its own Store `active theme` field). Facet *counts* (how many results remain per filter value) are an engine-native aggregation feature — not computed by this platform, only requested and displayed.

### 3.4 Ranking & Merchandising

Default ranking stays relevance-first (unchanged). Merchandising — a merchant's ability to pin or boost specific products for specific queries — is a new, small `search_merchandising_rules` table (`query_pattern`, `product_id`, `boost | pin`) owned by `MODULE:SEARCH`, applied as a post-processing step on the engine's own relevance-ranked result before pagination, never a change to the underlying relevance algorithm itself — keeping the engine swap in §2 fully isolated from merchant-configured ranking overrides.

### 3.5 Recent & Popular Searches

- **Recent searches**: purely client-local (`localStorage`, per-browser, same reasoning as `PERFORMANCE_FOUNDATION.md` §8's existing cart-state precedent) — no backend storage, no privacy surface, since this is explicitly per-visitor convenience, not a merchant-facing insight.
- **Popular searches**: requires real backend aggregation — a new `search_query_log` table (`term`, `resulted_in_click: bool`, `searched_at`), written by the same `search/products` request path, read by a new aggregate endpoint. This is Confidential-adjacent in aggregate (reveals demand signal a competitor would value) even though no individual record is Sensitive — classified `Internal` per `DATA:CLASSIFICATION`, staff-only, never exposed raw to the storefront (only a merchant-curated "Popular searches" list, mirroring `LANDING_ENGINE_ARCHITECTURE.md` §3.4's "server-side aggregation, not raw client exposure" discipline).

### 3.6 AI Search (Future)

Named, not designed, per the master task's own instruction — a future engine swap (§2's own seam) to a vector/semantic-search-capable engine, or a query-understanding layer in front of the existing keyword engine, attached through the Extension System per `VISION:NON_GOALS`'s "AI capability is additive" rule, exactly like every other AI-future-extension-point named throughout this research pass (`04_MODULE_ARCHITECTURE.md` §7's own Search entry already names this: *"AI-assisted semantic search (Phase 4, AI-only)"* — this document confirms, not invents, that placement).

---

## 4. Storefront Consumption Path

Identical to every other Category-A (public read) capability in `STORE_FRONTEND_ARCHITECTURE.md` §3.2 — the BFF's service credential calls `search/products`/`search/suggest` server-side, shapes the response to `STOREFRONT_COMPONENT_ENGINE.md`'s own contracts, and the `/search` route (`STORE_FRONTEND_ARCHITECTURE.md` §1.1, §2's SSR row) renders it. No new auth model is required beyond what that document already proposes — Search's own `search.products.view` permission is granted to the same scoped Storefront Service account §3.2 of that document already defines, one more `.view` permission on an existing account, not a new credential.

---

## 5. What This Document Deliberately Does Not Do

- Does not select a specific search engine vendor — an Engineering ADR-level decision for whichever phase implements this, per `GOVERNANCE:ADR_OWNERSHIP`.
- Does not design the admin UI for synonym/merchandising-rule management — a real, separate future admin-module screen, following this project's own established "research contract, then build UI" pattern used for every other module.
- Does not extend search to Customers/Orders/CMS content — `04_MODULE_ARCHITECTURE.md` v1.5's own Change Log already scoped `MODULE:SEARCH` to Catalog products only, deliberately excluding cross-entity federation as "materially larger... not scoped here." This document does not reopen that boundary; a future CMS/Blog search (per `IMPLEMENTATION_MASTER_PLAN.md` §29's own "later cross-CMS" note) is a distinct, future proposal.

---

End of Document
