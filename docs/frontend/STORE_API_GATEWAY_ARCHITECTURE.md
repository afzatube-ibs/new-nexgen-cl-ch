# neXgen Core — Store API Gateway (BFF) Architecture

| Field | Value |
|---|---|
| **Status** | **Draft — Proposed, pending Product Owner review** |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-17 (§1 deployment-shape amended 2026-08-17, Phase 4.1) |
| **Phase** | 3.3, Phase B (architecture) — implemented as Slice 1 in Phase 4.1, see `planning/reviews/PHASE_4_1_STORE_API_GATEWAY_SLICE1_REPORT.md` |
| **Relationship to prior work** | `STORE_FRONTEND_ARCHITECTURE.md` §3 already established *why* a BFF is required (the zero-public-API-surface finding) and its two capability categories (A: public reads via a service credential; B: customer-identified writes, blocked on a future backend auth guard). **This document does not re-derive that** — it formalizes the Gateway those categories run through, into the dedicated architectural layer the Product Owner's own instruction names: *"The Storefront MUST NEVER expose internal commerce APIs directly."* |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-17 | §1's deployment shape amended: the Gateway is implemented as `apps/store-api-gateway`, a standalone Node/Fastify service — **not** Next.js Route Handlers inside `apps/storefront` as originally specified below | Explicit Product Owner direction at Phase 4.1 implementation time (the prompt itself named `apps/store-api-gateway` and explicitly excluded any Next.js/React dependency from this slice) — the same "PO real-time direction supersedes a prior phased plan, recorded after the fact" pattern already established repeatedly across this engagement (e.g. Checkout guest flow, Payments Bangladesh-first scope). The practical benefit this amendment captures: the Gateway now ships and is independently deployable/scalable without first needing `apps/storefront` (which does not exist yet) to be scaffolded at all — a real sequencing win, not merely a preference |

---

## 1. Why a Named, Dedicated Gateway Layer — Not Just "Some Route Handlers"

`STORE_FRONTEND_ARCHITECTURE.md` §3 described the BFF functionally (what it must do, and why). This document gives it the shape of a real architectural layer with its own contract — the same "a real seam, not an implementation detail" discipline this project already applied to the Theme Engine (a real contract, `THEME_ENGINE_ARCHITECTURE.md` §2.3) rather than leaving theming as "some props passed around." **As amended above**: the Store API Gateway is implemented as `apps/store-api-gateway`, a standalone Fastify/TypeScript service (Engineering-ADR-level framework choice, documented in the Slice 1 report — Track 2 per `GOVERNANCE:ADR_OWNERSHIP`, no Product Owner re-litigation required), independently deployable from `apps/admin` and the not-yet-built `apps/storefront`, communicating with the real backend exactly as originally specified (Category A/B, §3 below, unchanged) — with its own internal layering: **Request ID → Logging → Rate Limit → Guest Session → [per-route] Cache → Localization/Currency → Forward → Response Normalization** — a fixed pipeline every request passes through, never a per-endpoint ad hoc implementation.

This is also the layer `CDP_ARCHITECTURE.md` §4.5's event ingestion, and a future Marketplace app's webhook consumption (`MARKETPLACE_PLATFORM_ARCHITECTURE.md`), both attach to — one Gateway, multiple consumers, never a proliferation of independent entry points into the real backend.

---

## 2. Authentication & Sessions

### 2.1 Session types

| Session type | Identity | Storage | Lifetime |
|---|---|---|---|
| **Anonymous** | Device Identity only (`CDP_ARCHITECTURE.md` §3.1) | First-party cookie (`nx_did`) | Durable (years, refreshed on visit) |
| **Guest** | Anonymous + a resolved email/name at Checkout (real, already-supported backend capability) | Same cookie, `guestId` attached server-side | Bound to the `CheckoutSession`'s own real 60-minute lifetime (confirmed real: `CheckoutSession::LIFETIME_MINUTES`) |
| **Customer** | Authenticated, backed by the future customer auth guard (`STORE_FRONTEND_ARCHITECTURE.md` §3.3 — this document inherits that gap, does not resolve it) | HttpOnly session cookie, set by the Gateway's own login/register handler | A real, revocable session, mirroring `SECURITY:SESSION_MANAGEMENT`'s already-Accepted platform-wide session model applied to a customer rather than a staff operator |

### 2.2 Anonymous Cart vs. Authenticated Cart

Unchanged from, and directly citing, `STORE_FRONTEND_ARCHITECTURE.md` §3.3/§8: anonymous cart state lives client-side (`localStorage`) until a `CheckoutSession` is actually needed; an authenticated customer's cart, once Category B exists, is the same `CheckoutSession` concept persisted server-side against their real Customer identity rather than only a browser. The Gateway's own `/api/storefront/cart/*` handlers are what make this transition invisible to the Storefront Engine and every Section/primitive consuming cart data — they always call the Gateway's own stable cart contract, never care whether the session behind it is anonymous or authenticated.

### 2.3 Wishlist

Follows the same Category-A/B split as everything else in this Gateway: a Wishlist has no meaning for a purely anonymous visitor with no durable identity to attach it to beyond the Device Identity itself — so an **anonymous wishlist is Device-Identity-scoped**, stored the same way as an anonymous cart (client-local, bridged server-side only once a real backend Wishlist module exists, per `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §10's own confirmation that no Wishlist backend exists today). This document adds nothing to that already-stated gap beyond confirming the Gateway's own `/api/storefront/wishlist/*` route shape is reserved now for when it does.

### 2.4 Token Strategy & Refresh Tokens

The Gateway, not the browser, holds the only credential capable of calling the real staff-gated backend (`STORE_FRONTEND_ARCHITECTURE.md` §3.2's service credential for Category A). For Category B, once the customer auth guard exists: the Gateway issues its **own** short-lived session token to the browser (HttpOnly cookie, §2.1) and separately holds whatever token/credential the backend's own customer guard requires to authorize its calls — the browser never sees, and never could see, a backend-issued token directly. A refresh-token rotation (a longer-lived, single-use-per-rotation refresh credential exchanged for a new short-lived access token, the standard, proven OAuth2-adjacent pattern) is the Gateway's own internal concern between itself and the backend guard — this is explicitly named as a requirement the future backend Category-B design must satisfy, not something this document can fully specify without that backend module existing yet.

---

## 3. Security

### 3.1 Rate Limiting

Per-Device-Identity and per-IP rate limiting at the Gateway's own edge (before any backend call is attempted), materially stricter on write-shaped routes (cart mutation, checkout submission, future account actions) than on read routes — directly extending `API:RATE_LIMITING`'s already-Accepted platform-wide philosophy to a layer that additionally has to defend against anonymous, unauthenticated abuse the staff-only backend never had to consider (a bot scripting `add-to-cart` calls has no permission check to stop it the way every backend route already does). A rate-limited caller receives an explicit, structured response (`API:ERROR_MODEL`'s own already-Accepted shape) — never a silent drop, per `PRINCIPLES:EXPLICIT_FAILURE`.

### 3.2 Circuit Breakers

Each backend module the Gateway calls (Catalog, Search, Checkout, ...) is wrapped in its own independent circuit breaker — a module experiencing elevated error rates or latency is temporarily short-circuited (fast-failing with a cached or degraded response, §4.1) rather than the Gateway continuing to hammer a struggling backend with full request volume. This is the concrete, Gateway-layer implementation of `ENGINEERING:RESILIENCE`'s "failure isolation" and "graceful degradation" properties — a real, in-scope circuit breaker per upstream dependency, not a single global one, so a struggling Search index never degrades Checkout's own circuit.

---

## 4. Caching & Preview Modes

### 4.1 Caching

Fully specified in `STORE_FRONTEND_ARCHITECTURE.md` §4 (ISR page cache, tagged BFF response cache, CDN/edge cache) — this document adds one Gateway-specific behavior: on a circuit-breaker trip (§3.2), a read (Category A) route serves its **last-known-good cached response**, explicitly marked stale (a response header/flag the Storefront Engine can choose to surface, e.g. a subtle "showing recent data" indicator) rather than a hard error — directly serving `PRINCIPLES:EXPLICIT_FAILURE`'s "never silently degrade" rule while still keeping the storefront up during a backend incident.

### 4.2 Preview Mode / Draft Mode (CMS & Theme)

**New in this document** — not covered by `STORE_FRONTEND_ARCHITECTURE.md`. A merchant editing a CMS Page (`CMS_ARCHITECTURE.md` §3.3's `draft`/`pending_review` states) or previewing an uninstalled/unconfigured Theme Package (`THEME_ENGINE_ARCHITECTURE.md`) needs to see the *real* rendered result before publishing — Next.js's own built-in Draft Mode (`draft-mode` cookie, bypassing ISR's static cache for the current request only) is the mechanism, gated by a signed preview token the CMS admin surface generates (short-lived, single-page-scoped, never a general "see all drafts" bypass). A Theme Preview is architecturally identical — the Gateway resolves the *requested* `ThemePackage.id` (an explicit query/cookie override) instead of the store's own configured active theme (`THEME_ENGINE_ARCHITECTURE.md` §3 step 2), for the duration of the preview session only, never persisted as the store's real active theme until the merchant explicitly activates it.

---

## 5. API Versioning & Future Consumers

### 5.1 REST today

The Gateway's own `/api/storefront/*` contract is versioned independently of the backend's own `ADR-0007` REST/OpenAPI versioning — the Gateway's contract can stay stable across a backend version bump (it's an abstraction specifically to buy that independence, per `STORE_FRONTEND_ARCHITECTURE.md` §3.3's own "only the BFF's proxy implementation changes" design goal) and vice versa.

### 5.2 Future GraphQL

Named as a real, credible future option, not designed here: a GraphQL layer in front of the same Gateway internals (§1's pipeline) would let a future Theme Package or native app request exactly the fields a given page needs in one round trip — a genuine reason to consider it (avoiding the REST-shaped "several round trips to assemble one page" cost), weighed against the real cost of running two API paradigms. Recommended posture: **not needed for Beta 1**, revisit once a real second consumer (§5.3) creates actual pressure for it, consistent with `ADR-0009`'s own "no tool this repository doesn't yet need" discipline (applied there to Turborepo/pnpm, applied here to GraphQL).

### 5.3 Future Mobile App, Native App, PWA

All three are, architecturally, additional consumers of the exact same Gateway contract §1 already defines — this is a direct, stated consequence of the BFF pattern, already named in `NEXTGEN_FRONTEND_MASTER_PLAN.md` §6.5. A PWA specifically also needs the Gateway's Offline Event path (`CDP_ARCHITECTURE.md` §4.5) and a service-worker-compatible caching contract (§4.1's stale-serving behavior is directly reusable for offline-first PWA caching, not a separate mechanism).

---

## 6. Localization, Multi-Domain, Multi-Store

Fully specified in `STORE_FRONTEND_ARCHITECTURE.md` §§6–7 — no new Gateway-specific design required. The Gateway is simply where the store/locale resolution middleware (§1.3 of that document) actually threads its resolved values into every backend call it proxies.

---

## 7. Error Handling & Observability

### 7.1 Error Handling

Every Gateway response — success or failure — uses the same `API:ERROR_MODEL`/`API:RESPONSE_ENVELOPE` shape the real backend already uses (already-Accepted, platform-wide), so a Theme Package or future mobile client learns one error-handling pattern regardless of whether it's talking to the Gateway or (never directly, but conceptually) the backend it proxies. A backend error is never re-shaped into a different envelope by the Gateway — it is passed through, with Gateway-specific errors (rate-limited, circuit-open, cache-stale) using the identical envelope shape for consistency.

### 7.2 Observability

Every Gateway request carries and propagates the real backend's own correlation identifier convention (`API:CORRELATION`, already-Accepted) — a request entering the Gateway from an anonymous browser gets a correlation ID minted at the Gateway itself (the browser has no backend-issued one to carry), and that same ID threads through every backend call the Gateway makes on its behalf, into `CDP_ARCHITECTURE.md` §4.1's own event correlation, and into whatever log/metrics/trace tooling `ENGINEERING:OBSERVABILITY` already requires platform-wide. This is what makes a single customer-facing incident (a failed checkout) traceable end-to-end — browser → Gateway → backend → CDP event stream — through one correlation ID, never a reconstruction exercise across disconnected logs.

---

## 8. What This Document Deliberately Does Not Do

- Does not implement the Gateway — architecture only.
- Does not select a GraphQL library or specify a schema — §5.2 is a recommendation to defer, not a design.
- Does not design the customer auth guard's own backend token issuance mechanism — §2.4 states the Gateway's own requirement of it, not the backend's implementation.

---

End of Document
