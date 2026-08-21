# neXgen Core — Storefront Frontend Architecture

| Field | Value |
|---|---|
| **Status** | **Draft — Proposed, pending Product Owner review** (per `GOVERNANCE:DOCUMENT_LIFECYCLE`; not yet Accepted) |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-17 |
| **Phase** | Pre-2.2 — Customer Experience Platform architecture (research and design only — **no code written**, per this phase's own governing instruction) |
| **Package** | `apps/storefront` (`ADR-0006`), `packages/storefront-engine` (`ADR-0009`), consuming `packages/api-client`, `packages/tokens`, `packages/ui` |
| **Builds on** | `ADR-0006` (rendering engine, already Accepted — this document does not reopen it), `docs/frontend/THEME_ENGINE_ARCHITECTURE.md`, `docs/frontend/STOREFRONT_COMPONENT_ENGINE.md`, `docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md`, `docs/frontend/PERFORMANCE_FOUNDATION.md` |
| **Scope boundary** | Everything named in `ADR-0006`'s own "Consequences" as still open (routing, the API layer, caching, SEO, localization/currency, multi-domain) is settled here. This document does not implement anything, does not modify the backend, and does not design any specific page's visual content. |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-18 | §1.1's `/products/[slug]`, `/categories/[slug]`, `/brands/[slug]`, `/collections/[slug]` routes are implemented (Beta Milestone 1) as a composite `{id}-{slug}` segment, not a pure slug — see §1.4 (new) | Real, load-bearing gap found during implementation, not before: the Store API Gateway's own `/v1/products/:id` (and category/brand/collection equivalents) only accept the real UUID (`GATEWAY_SLUG_READINESS.md`, Phase 4.1) — a pure-slug URL has no way to resolve to a Gateway call without either fetching every entity to find a match (does not scale) or a backend change (out of this milestone's authority). The composite segment is the same "readable slug in the URL, id does the real lookup" pattern already proven at scale by Amazon/eBay/Etsy for this identical constraint — real SEO-shaped URLs today, zero backend change, and a one-file swap (`routing/idSlug.ts`) the day the backend gains real slug lookup |
| 2026-08-18 | §1.3's middleware is also the guest-session (`nx_did`) cookie relay, not only store resolution | `STORE_API_GATEWAY_ARCHITECTURE.md` §2.1's guest-session cookie is minted by the Gateway, not this app — only Next.js middleware (not a Server Component) can write a `Set-Cookie` back to the browser for a page render, so the mint-on-first-visit relay had to live here regardless; named explicitly since the original §1.3 only described store resolution |

---

## 0. The One Finding Every Section Below Has to Answer To

Direct code confirmation, this research pass (`apps/backend/app/Domains/Commerce/Checkout/routes.php`, `.../Catalog/routes.php`, `config/auth.php`):

**Every single backend route, in every one of the 19 real modules — including `GET /brands`, `GET /categories`, product listing, everything — requires `auth:sanctum` plus a staff `permission:` key.** There is exactly one auth guard (`web`, backed by the staff `User` model). Checkout's own `Authorization\PermissionRegistry` states this outright: *"no customer-facing authentication guard exists yet on this platform... A future storefront-facing Checkout surface, once one exists, would be a new set of routes under a new guard, not a change to this registry."*

This is not a Checkout-specific gap. **Zero public, anonymous-callable API surface exists anywhere in this backend today** — not product browsing, not search, not customer registration as a customer (only as staff-managed `Customers` records), nothing. A merchant's storefront, as things stand, cannot legally call any backend endpoint without a staff bearer token, which browser-side code must never hold.

Every architectural decision in this document is downstream of that fact. It is the single largest blocking gap between "the Storefront Engine is designed" and "a real customer can load a real page" — bigger than any rendering or theming decision. §3 is this document's answer to it.

---

## 1. Routing

### 1.1 URL structure (proposed, App Router file convention)

```
/                                  → Homepage (CMS Page, §5 of CMS_FOUNDATION_ARCHITECTURE.md)
/products/[slug]                  → Product Detail (Catalog)
/categories/[slug]                → Category listing (Catalog)
/collections/[slug]               → Collection listing (Catalog)
/brands/[slug]                    → Brand listing (Catalog)
/search                           → Search results (§ SEARCH_ARCHITECTURE.md)
/cart                             → Cart (full-page fallback; CartDrawer is the primary UI)
/checkout                         → Checkout (SSR, per ADR-0006)
/checkout/confirmation/[orderId]  → Post-purchase confirmation
/account                          → Customer account shell (SSR, authenticated)
/account/orders, /addresses, ...  → Account sub-routes
/[cmsSlug]                        → Catch-all CMS Page route (landing pages, static pages) — resolved LAST, after every reserved segment above, per §1.2
/blog, /blog/[slug]               → Blog (Phase 2 backend, per IMPLEMENTATION_MASTER_PLAN §32 — route reserved now, unimplemented until that module exists)
```

`slug` is the identifier every Catalog/CMS entity already exposes (`Product.slug`, `Category.slug`, etc. — confirmed real fields from the admin's own Catalog work); no new backend field is required for this routing scheme.

### 1.2 Reserved-segment resolution order

A CMS-authored Page (§`CMS_FOUNDATION_ARCHITECTURE.md`) can be given any slug a merchant chooses, including one that collides with a reserved segment above. The Core (`apps/storefront`, per `THEME_ENGINE_ARCHITECTURE.md` §2.1) resolves routes in this fixed order, never merchant-configurable: **reserved application routes first** (`/products/*`, `/cart`, `/checkout`, `/account/*`, `/search`), **then** the CMS catch-all. This is the same "explicit, structural, never a silent collision" discipline `PRINCIPLES:EXPLICIT_FAILURE` already requires elsewhere — a merchant attempting to create a Page at `/checkout` gets a clear validation error from the CMS admin surface (§`CMS_ARCHITECTURE.md`), not a silently-shadowed route.

### 1.3 Store & domain resolution (feeds §6)

Every request is resolved to exactly one store **before** any route matches, via Next.js middleware (`apps/storefront/middleware.ts`) — this is the concrete implementation of `THEME_ENGINE_ARCHITECTURE.md` §3 step 1's "determine the active store for the current request," made real rather than left as a named placeholder. Phase 1 backend scope means this resolves to the single default store unconditionally today; the middleware's own shape (a pure function from request → store identifier) is what makes multi-store (§6) an additive change to that one function, not a routing rewrite.

### 1.4 Composite `{id}-{slug}` detail segments (Change Log, Beta Milestone 1)

`/products/[idSlug]`, `/categories/[idSlug]`, `/brands/[idSlug]`, `/collections/[idSlug]` — the URL segment is `{the real entity id}-{a slugified name}`, e.g. `/products/019fe82d-0e24-7301-9426-14ec19f772c3-premium-wireless-headphones`. The id is authoritative and is the only part ever sent to the Gateway; the slug exists purely for a human/SEO-readable URL and is never parsed for correctness — a stale slug in an old bookmarked URL (a product renamed after the link was shared) still resolves correctly, exactly like the identical pattern on Amazon/eBay/Etsy. Every internal link this app generates produces this composite form (`routing/idSlug.ts`'s `buildIdSlugSegment`); a request that resolves to a bare slug (no leading UUID) can only be a manually-typed or malformed URL, and is treated as a real 404 (`GatewayRequestError.isUnsupportedIdentifier`), not a distinct error class a visitor would ever need to understand. This is a deliberate amendment to this section's own original pure-`[slug]` routes — see the Change Log at the top of this document and `GATEWAY_SLUG_READINESS.md` for the backend gap that makes a pure slug route unresolvable today.

---

## 2. Rendering Strategy

`ADR-0006` already settles the per-route SSG/ISR/SSR/CSR mix as an Accepted decision — this document does not reopen it, only maps it onto §1's concrete routes:

| Route class | Mode | Why |
|---|---|---|
| Product Detail, Category/Collection/Brand listing, CMS Pages | **SSG + ISR** | Change infrequently relative to traffic; revalidation interval is per-Section CMS config (`CMS_FOUNDATION_ARCHITECTURE.md` §5's Scheduling), never a global constant |
| Search results | **SSR** | Genuinely request-specific (query string), not meaningfully cacheable per-URL at the page level; the underlying Search index itself is cached (`SEARCH_ARCHITECTURE.md` §5) |
| Cart, Checkout, Account | **SSR** | Request-specific, session/customer-specific content, per `ADR-0006`'s own explicit list |
| CartDrawer, Countdown, StickyBuyBar | **CSR** (`"use client"`, narrow opt-in) | Already named exactly in `PERFORMANCE_FOUNDATION.md` §5 — not redecided here |

**Streaming**: every SSG/ISR page composes multiple independently-fetched Sections (§`CMS_FOUNDATION_ARCHITECTURE.md`); each Section that fetches its own product/category data (via the Storefront Engine, never itself — `THEME_ENGINE_ARCHITECTURE.md` §4) is wrapped in its own `<Suspense>` boundary with a `Skeleton` fallback (`DESIGN_SYSTEM.md` §2), so a slow below-the-fold Section (e.g. `RecommendedProducts`, which may depend on a slower personalization query) never blocks the above-the-fold Hero from streaming to the browser first. This is React Server Components' own streaming model, not a custom mechanism — consistent with `ADR-0006`'s "Next.js's own supported... model, not a custom mechanism this platform builds" instruction applied one layer further.

---

## 3. The Storefront API Layer (the load-bearing section — resolves §0)

### 3.1 Why a Backend-for-Frontend (BFF) layer is required, not optional

Two categories of capability exist, and they cannot be solved the same way:

**Category A — Public reads** (product/category/brand/collection browsing, search, published CMS content). These need no customer identity at all; they need *a* credential, held server-side, never shipped to a browser. **Category B — Customer-identified writes** (cart mutation, checkout submission, account data, order history). These need a *real, distinct* customer identity the backend does not have a concept of today.

Conflating these into "give the browser a backend token" is not an option — it would mean either shipping a staff bearer token to anonymous browser JavaScript (a `SECURITY:SECURITY_BOUNDARIES` violation of the worst kind: every storefront visitor would hold staff-equivalent API access) or blocking the entire storefront on backend work this phase is explicitly forbidden from doing ("Don't modify backend").

The resolution: **`apps/storefront` never calls the backend directly from browser code.** Every backend call is proxied through Next.js Route Handlers (`apps/storefront/app/api/*`) running server-side only — this *is* the BFF, and it is what makes Category A solvable today and Category B correctly scoped as a named, future backend dependency rather than a silent gap.

### 3.2 Category A — solvable today, zero backend change required

A single, narrowly-scoped **service credential** (a Sanctum token issued to a dedicated, permission-minimal "Storefront Service" staff account — created via the existing Identity & Access admin surface, no new backend capability) is held server-side only (`STOREFRONT_SERVICE_TOKEN`, an environment secret per `SECURITY:SECRETS_MANAGEMENT`, never sent to the browser). It is granted exactly the `*.view` permissions §7 of `04_MODULE_ARCHITECTURE.md`'s catalog already names as read-only (`catalog.products.view`, `catalog.categories.view`, `catalog.brands.view`, `catalog.collections.view`, `catalog.tags.view`) and nothing else — no `.manage` permission, ever, per least-privilege (`SECURITY:PHILOSOPHY`).

Every Route Handler serving Category A data (`GET /api/storefront/products/[slug]`, `/categories/[slug]`, etc.) calls the real backend with this service token, server-side, and returns only the fields the Storefront Component Engine's own contracts (`STOREFRONT_COMPONENT_ENGINE.md` §2 — `ProductSummary`, `CategorySummary`, etc.) actually need — never the full admin-shaped resource. This is the same "an event carries only what the publisher's contract deliberately includes" discipline `SECURITY:EVENT_SECURITY` already applies to the event bus, applied here to the BFF's own response shaping.

This requires **zero backend modification** — it is a new, additive staff account plus a new frontend-only proxy layer, fully within this phase's stated constraints, and it is enough to render every SSG/ISR page in §2's table.

### 3.3 Category B — the named, blocking backend gap

Cart/Checkout/Account cannot be solved by a shared service credential — a shared credential has no notion of *which* customer is adding to *which* cart. This requires the backend to eventually gain what its own code already names as missing: a **customer-facing authentication guard**, distinct from the staff `web` guard, plus a public (rate-limited, unauthenticated-until-registration) route surface for it.

This document does not design that backend work — it is out of a frontend-architecture document's authority, and per `MODULE:AUTHORITY` requires its own formal addition to `04_MODULE_ARCHITECTURE.md` before any implementation begins. What this document *does* commit to, so the Storefront Engine is not redesigned when that backend work lands:

- The BFF's Route Handlers for Category B (`/api/storefront/cart/*`, `/api/storefront/checkout/*`, `/api/storefront/account/*`) are **specified now, implemented as thin proxies to the future customer guard's routes later** — the Storefront Engine and every Section/primitive consuming cart/account data depends only on the BFF's own stable contract (`packages/api-client`'s storefront types), never on the backend's customer-guard route shape directly. When the backend guard ships, only the BFF's proxy implementation changes; nothing above it does.
- A customer's session token (once the guard exists) is held in an **HttpOnly cookie**, set by the BFF's own login/register Route Handler — never `localStorage`, unlike the admin interface's own deliberate choice (`ADMIN_SHELL_ARCHITECTURE.md` §7) — because a storefront customer's token must survive an SSR request (§2's Cart/Checkout/Account rows) without a client-side JavaScript round-trip, and must never be readable by a Theme Package's own client-side code (`THEME_ENGINE_ARCHITECTURE.md` §4's "no Theme Package fetches its own data" rule extends naturally to "no Theme Package ever sees a customer's session token").
- **Anonymous cart state**, until a customer authenticates, lives exactly where `PERFORMANCE_FOUNDATION.md` §8 already says it does — `localStorage`, bridged to Checkout at the point a session actually needs a backend `CheckoutSession` (i.e., only once the customer proceeds toward checkout, not on every "add to cart" click) — minimizing how often the BFF needs to call the real, staff-gated `Checkout` module at all before Category B exists.

### 3.4 What this means for Beta 1 (feeds `BETA1_FRONTEND_ROADMAP.md`)

A real, live Storefront can ship for **browsing** (Category A: home, category, product, search, CMS pages) without any backend change. A real Storefront **cannot** ship real cart/checkout/account until Category B's customer guard exists on the backend. This is this document's single most important scheduling fact, and it is stated here in full rather than discovered later.

---

## 4. Caching

Three layers, each with a distinct invalidation trigger:

1. **ISR page cache** (Next.js, per-route, per §2) — invalidated by **on-demand revalidation** (`revalidateTag`), triggered by a webhook the BFF exposes (`/api/storefront/revalidate`) that the backend's own event bus could call once Webhooks & Integrations (`IMPLEMENTATION_MASTER_PLAN.md` §34, Phase 2) exists; until then, time-based ISR intervals alone (no push invalidation) — an accepted, temporary staleness window, not a silent gap.
2. **BFF response cache** (Route Handler level, `fetch` with Next.js's own `cache`/`tags` options) — tagged by entity (`product:{slug}`, `category:{slug}`) so a single product update invalidates only that product's own tag, never a blanket cache flush.
3. **CDN/edge cache**, per `PERFORMANCE_FOUNDATION.md` §6 — named there as a Phase 2.2+ deployment concern, unchanged by this document; every SSG/ISR page's own static output is what the CDN actually caches.

Cart/Checkout/Account responses are never cached at any layer (`Cache-Control: private, no-store`), consistent with `API:CORRELATION`'s and `SECURITY:SESSION_MANAGEMENT`'s expectation that authenticated, session-specific data is never shared across requests.

---

## 5. SEO

- **Sitemap**: `apps/storefront/app/sitemap.ts` (Next.js's own built-in convention), generated at build/revalidation time from the BFF's own paginated product/category/CMS-page listing — never hand-maintained.
- **Structured data**: JSON-LD (`Product`, `BreadcrumbList`, `Organization`) emitted per Product Detail and listing page, built from the same `ProductSummary`/`CategorySummary` contracts §3.2 already defines — no separate SEO-specific data shape.
- **Metadata**: Next.js's own `generateMetadata` per route, sourced first from Catalog's existing per-product `metaTitle`/`metaDescription`/`metaKeywords` fields (already real, per `PHASE_3_1_CMS_ARCHITECTURE.md` §3's own confirmation these are Catalog's, not a separate SEO module's), falling back to a derived default (product name/description) when unset — never a blank `<title>`.
- **Canonical URLs & hreflang**: one canonical URL per entity regardless of query-string filters/sort; `hreflang` alternates emitted per configured locale (§7) once more than one locale is active — both are Next.js `generateMetadata` output, not a separate mechanism.
- **robots.txt**: `apps/storefront/app/robots.ts`, disallowing `/cart`, `/checkout`, `/account/*`, `/api/*` explicitly — the only routes with no reason to be crawled.

---

## 6. Multi-Domain & Future Multi-Store

Per `04_MODULE_ARCHITECTURE.md` §7's "Organizations & Multi-Store" and the master plan's own Phase 3 timing for real multi-store: **not exercised today**, single-tenant Phase 1 backend. What this document commits to now, so that future work is additive:

- §1.3's middleware resolves store **before** routing — a future multi-domain lookup (`store.example.com` → store ID, or a path-prefix scheme `example.com/store-a/`) is a change to that one resolution function, never a change to any route, Section, or primitive above it.
- The `ThemePackage.id` resolution (`THEME_ENGINE_ARCHITECTURE.md` §3 step 2) is already keyed by store, not global — multi-store multi-theming is already representable in that contract, unexercised, not redesigned.
- Every BFF Route Handler (§3) threads the resolved store identifier through to the backend call it proxies, even though Phase 1's backend accepts only the one implicit default store today — this is a no-op parameter now and a real one the day the backend gains multi-store scope, per the same "extension, not redesign" discipline `ARCH_PLAN:RESOLVED_DECISIONS` item 1 already requires platform-wide.

---

## 7. Localization & Currency

- **URL strategy**: path-prefix locale segments (`/en/products/...`, `/bn/products/...`), Next.js App Router's own native `[locale]` dynamic segment convention — chosen over domain-per-locale (simpler for a merchant with no need for ccTLDs yet) and over cookie-only locale switching (which breaks SEO's per-locale indexing and `hreflang` in §5).
- **Source of truth**: the backend's existing Localization & Currency module (`GET /api/v1/locales`, already real per `CMS_FOUNDATION_ARCHITECTURE.md` §6's own confirmation) — the BFF proxies this the same way it proxies Catalog reads (§3.2); no second locale registry.
- **Currency display**: derived from the resolved store's configured currency (§6) by default; a future per-visitor currency-switcher is a storefront-local UI preference (`localStorage`, same reasoning as `PERFORMANCE_FOUNDATION.md` §8) that affects *display formatting only* until Checkout — the actual settlement currency remains whatever `CheckoutSession.currency_code` is set to at checkout start, per the real `Models\CheckoutSession` field already confirmed in this phase's backend research. A storefront must never imply a price is payable in a currency Checkout cannot actually settle in.

---

## 8. Asset Pipeline

Already fully specified in `PERFORMANCE_FOUNDATION.md` §2 (`next/image`, R2/S3-compatible via Media's existing filesystem config) and §7 — this document adds nothing new, only confirms every image the BFF's Category A responses reference resolves through Media's own existing URL scheme, never a second asset path.

---

## 9. What This Document Deliberately Does Not Do

- Does not design the BFF's exact Route Handler file layout or TypeScript signatures — that is Phase 2.2 implementation, built *from* §3's contract, not specified here.
- Does not decide the customer-facing auth guard's real backend shape (password policy, token mechanism, MFA) — named as required in §3.3, designed by whichever future phase formally adds it to `04_MODULE_ARCHITECTURE.md`.
- Does not build a CDN/edge deployment topology — `PERFORMANCE_FOUNDATION.md` §6 already correctly defers this to Phase 2.2+ deployment work.

---

End of Document
