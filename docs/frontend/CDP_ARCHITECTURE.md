# neXgen Core — Customer Data Platform (CDP) Architecture

| Field | Value |
|---|---|
| **Status** | **Draft — Proposed, pending Product Owner review** |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-17 |
| **Phase** | 3.3, Phase A — architecture and research only, no implementation |
| **Builds on** | `STORE_FRONTEND_ARCHITECTURE.md` §3 (the BFF this platform already committed to), `LANDING_ENGINE_ARCHITECTURE.md` §3.5/§3.6 (server-side tracking, split-test cookie assignment — this document formalizes what that one narrowly proposed), the real `Platform\Foundation\EventBus` (`DomainEventBus`, `DomainEvent`, `TenantId` — confirmed real, in-process, UUIDv7-identified, correlation-ID-propagating, tenant-scaffolded) |
| **Spans** | Frontend (event capture) and a proposed new backend module (`MODULE:CDP`, event storage/routing/destinations) — placed in `docs/frontend/` for continuity with the rest of this research initiative, not because it is frontend-only |

---

## 1. What a CDP Actually Is Here, and Why It's Not the Internal Event Bus

This platform already has a real, working, in-process event bus (`Platform\Foundation\EventBus\Contracts\DomainEventBus`) carrying **operational domain events** — `OrderPlaced`, `CheckoutCompleted`, `PromotionApplied`, `ProductUpdated`. These are correctness-critical, module-to-module signals: Fulfillment reacts to `OrderPlaced`, Search reindexes on `ProductUpdated`. They are not, and must never become, the same stream as **behavioral events** — `PageViewed`, `ProductViewed`, `SectionScrolledIntoView`, `AddedToCart` (pre-checkout, entirely client-local today per `STORE_FRONTEND_ARCHITECTURE.md` §8's cart design) — which have no backend counterpart today, are high-volume, loss-tolerant, and exist for a completely different purpose: understanding and acting on customer behavior, not driving commerce correctness.

**This document is the architecture for the second stream.** It is additive to the real `DomainEventBus`, not a replacement — the CDP's own Event Engine (§3) is both a **new, first-party source of behavioral events** (things that only ever happen in the browser or the BFF, never on the backend) and a **consumer of the real, already-published commerce events** (`OrderPlaced`, `CheckoutCompleted`, `PaymentCaptured`, `PromotionApplied`, `RefundIssued`) for everything that needs to correlate behavior with real outcomes. Conflating the two — routing high-volume, best-effort behavioral telemetry through the same in-process bus that Fulfillment's own correctness depends on — would be a direct violation of `ENGINEERING:RESILIENCE`'s failure-isolation principle: a CDP destination outage (Meta's API down) must never be able to degrade Order fulfillment, and it cannot if the two streams are never the same stream.

---

## 2. Competitive Research — What "Good" Actually Looks Like

Brief, synthesized (not exhaustive) grounding, since a CDP's value is well-documented industry behavior, not proprietary insight:

- **Segment / RudderStack**: the reference architecture for "one SDK, many destinations" — a single client-side/server-side event API fanning out to dozens of destination adapters via a plugin registry. neXgen's own Destination architecture (§5) adopts this shape directly, because it is the correct shape, not because it needs reinventing — the same "don't invent, adopt the proven pattern" discipline this engagement has followed for Payments Gateways and Search Engines applies here too.
- **mParticle / Adobe Experience Platform / Bloomreach**: enterprise-grade identity resolution (§4) and audience-segmentation depth — the part every mid-market tool (including Segment's own free tier) under-invests in. neXgen's Identity Architecture (§4) is deliberately designed to this tier's bar from day one, since identity resolution done poorly is nearly impossible to retrofit (every event ever captured under a wrong identity model has to be recomputed).
- **PostHog**: the reference for a genuinely open, self-hostable, product-analytics-plus-CDP hybrid with session replay and feature-flag adjacency — directly relevant precedent given `ARCH_PLAN:RESOLVED_DECISIONS`' own self-hosted-first Phase 1 target; a CDP that assumes a SaaS-only vendor relationship (Segment, mParticle) would conflict with that target.
- **GA4 / Meta CAPI / TikTok Events API / Google Enhanced Conversions**: each independently solved "server-side event delivery, hashed PII matching, deduplication against a client-side pixel" — this is exactly `LANDING_ENGINE_ARCHITECTURE.md` §3.5's own server-side-first design generalized to every destination, not a Meta-specific mechanism (§5, §7).
- **Shopify Customer Events / GTM**: the reference for **merchant-authorable, sandboxed** custom tracking — a real gap in this document if left unaddressed, since a merchant or agency will always want to add a tracking snippet neXgen didn't anticipate. §5.4 names this as a required, sandboxed extension point.

**The synthesis**: no single named product gets identity, event delivery, *and* self-hosted-first architecture right simultaneously. That gap is this document's own opportunity, not a reason to clone any one of them.

---

## 3. Identity Architecture

### 3.1 The identity ladder

Every event carries exactly one point on this ladder, resolved in order of increasing certainty — never guessed, never silently upgraded without an explicit resolution event:

1. **Device Identity** — a durable, first-party client identifier (`nx_did`, a UUID set in a first-party cookie by the BFF on first request, per `STORE_FRONTEND_ARCHITECTURE.md` §3's own "server-side, never client-JS-generated" discipline for anything security- or identity-adjacent). Survives across sessions on the same browser/device.
2. **Session Identity** — a shorter-lived identifier (`nx_sid`), rotated per visit-with-a-gap (30 minutes of inactivity, the industry-standard session-boundary convention every named competitor in §2 already uses), scoping "this visit" for journey analytics (§8).
3. **Anonymous Identity** — the Device Identity, before any customer-identifying action has occurred; this is the identity every behavioral event (§4) carries by default.
4. **Guest Identity** — an anonymous visitor who has supplied an email/phone during Checkout (real, already-supported per the confirmed `MODULE:CHECKOUT` guest-resolution capability) without creating an account. A **resolution event** (`IdentityResolved`, §4.4) links the prior Anonymous Identity's own event history to this Guest Identity at the moment of resolution — never a silent merge, always an explicit, auditable event, per `PRINCIPLES:EXPLICIT_FAILURE` applied to identity integrity specifically.
5. **Customer Identity** — a real, authenticated customer (blocked today on the same Category-B backend gap `STORE_FRONTEND_ARCHITECTURE.md` §3.3 already named — this document does not reopen that gap, only confirms the CDP's identity ladder is ready for it the moment it exists). The same `IdentityResolved` resolution-event mechanism applies at login/registration.
6. **Cross-device identity** — resolved only through a real identifying action (login, checkout email match) linking two previously-separate Device Identities to the same Customer Identity — **never probabilistic fingerprinting**. This is a deliberate, stated privacy-first constraint: probabilistic cross-device matching is exactly the kind of opaque, hard-to-consent-to inference `SECURITY:PHILOSOPHY`'s "nothing is trusted implicitly" and GDPR's own purpose-limitation principle (§3.3) argue against, and every mid-market CDP's own reputational risk in this exact area (probabilistic matching accuracy is unverifiable to the end user) makes it a feature not worth having.

### 3.2 Cookie strategy

One first-party cookie (`nx_did`, HttpOnly where the value never needs client-JS access; a parallel non-HttpOnly companion only if a Theme Package's own client-side analytics code genuinely needs to read it, per an explicit, narrow exception) set by the BFF, never by a third-party script directly — this is what keeps identity resolution working under Safari ITP/Firefox ETP's third-party-cookie blocking, since first-party, server-set cookies are the one mechanism those browsers do not degrade. No third-party cookies are used by this platform's own tracking; every destination (§5) receives identity via server-side event delivery instead (§5.2), never a destination-owned third-party pixel cookie.

### 3.3 Consent Management — GDPR, CCPA, LGPD

A single `ConsentState` (`{ necessary: true /* always */, analytics: bool, marketing: bool, personalization: bool }`), captured once per Device Identity via a real consent-banner Section (a `STOREFRONT_COMPONENT_ENGINE.md`-shaped primitive, `ConsentBanner`, proposed here as a new addition to that inventory), stored server-side (a `consent_records` table, proposed, owned by the CDP module, immutable/append-only — a consent *change* is a new row, never an update, so a full consent history is always reconstructable, directly serving GDPR's own accountability principle) and echoed in every event's own envelope (§4.1) so a downstream destination adapter (§5) can enforce it independently, never trusting that "this event was only sent because consent existed" — the same defense-in-depth discipline `SECURITY:DEFENSE_IN_DEPTH` already requires platform-wide, applied to consent specifically.

- **GDPR** (EU/EEA visitors, detected by IP-derived region — a coarse, privacy-preserving signal, never a precise geolocation): opt-in required before `analytics`/`marketing`/`personalization` events fire at all; `necessary` events (e.g. cart-state persistence) are lawful under legitimate-interest/contract-performance grounds and require no banner.
- **CCPA** (California visitors): opt-out model — events fire by default, but a "Do Not Sell/Share My Personal Information" action (a required, real, linked control per CCPA's own statutory requirement) sets `marketing: false` and, per CCPA's own specific "sale/share" definition, suppresses every destination in §5 classified as a "sale/share" recipient (advertising destinations — Meta/Google/TikTok/Pinterest/Snap/LinkedIn/Microsoft — specifically, not the Warehouse destination, which is a first-party data store, not a third-party sale).
- **LGPD** (Brazil, directly relevant given this platform's own Bangladesh/South-Asia-first Payments precedent suggests a genuinely international, non-US-only audience): substantively similar to GDPR's opt-in model — the same `ConsentState` mechanism covers it without a third variant, since LGPD's own legal basis structure closely mirrors GDPR's.

**One consent mechanism, three legal regimes mapped onto it** — never three separate consent systems, per `PRINCIPLES:CONSISTENCY_OVER_NOVELTY` applied to compliance architecture.

---

## 4. Event Engine

### 4.1 Event Schema

```ts
interface CdpEvent {
  eventId: string;         // UUIDv7, generated at capture, per DomainEvent's own precedent
  name: string;            // versioned, stable name — "product_viewed", "checkout_started" — never a PHP/TS class name
  schemaVersion: number;   // §4.3
  occurredAt: string;      // ISO 8601, client or server clock (source, §4.5, determines which)
  identity: { deviceId: string; sessionId: string; customerId?: string; guestId?: string }; // §3.1
  consent: ConsentState;   // §3.3, always present, never inferred downstream
  correlationId?: string;  // threads to the real DomainEvent's own correlationId when this CdpEvent
                            // was triggered by (or itself triggers a lookup against) a real commerce
                            // event — e.g. a "checkout_completed" CdpEvent carries the same
                            // correlationId as the real CheckoutCompleted DomainEvent, so a
                            // journey (§8) can be reconstructed across both streams without a
                            // separate join table
  properties: Record<string, unknown>; // event-specific payload, validated against §4.2's Schema
}
```

### 4.2 Validation

Every event `name` has a registered Zod Schema (the same schema technology this platform already committed to for CMS content, `CMS_FOUNDATION_ARCHITECTURE.md` §3 — reused, not reinvented) validating `properties`' shape at the point of capture (client SDK) and again at the BFF ingestion endpoint (never trust the client alone, per `SECURITY:INPUT_VALIDATION`'s "nothing is trusted implicitly"). An event failing validation is **rejected with a specific reason, logged to the Diagnostics surface (§6), never silently dropped** — a malformed event is exactly the kind of data-quality problem §6's own Missing/Broken-Detection exists to surface, not hide.

### 4.3 Versioning

`schemaVersion` is per-event-name, incremented on any breaking shape change; the Event Router (§4.6) and every Destination adapter (§5) declare which `schemaVersion`(s) they understand, and an event at an unsupported version is queued for a defined deprecation window (mirroring `API:DEPRECATION`'s own already-Accepted platform-wide policy, applied here) rather than immediately dropped — giving a slow-to-update destination adapter time to catch up.

### 4.4 Queue, Retry, Dead Letter Queue, Idempotency, Dedupe

- **Queue**: every ingested event is written to a durable queue (Redis-backed, per `ADR-0004`'s own already-Accepted queue backbone — no new infrastructure decision required) before any Destination fan-out (§5) is attempted — ingestion and delivery are decoupled, so a slow or failing destination never blocks event capture itself, directly serving `ENGINEERING:RESILIENCE`'s graceful-degradation principle.
- **Retry**: exponential backoff per destination, bounded (a defined max-attempt count, not infinite) — a destination's own outage is contained to that destination's own delivery queue, never blocking any other destination's delivery of the same event.
- **Dead Letter Queue**: an event that exhausts retries lands in a DLQ, visible in the Diagnostics console (§6.1), with the ability to manually replay once the destination is confirmed healthy — never silently discarded, per `PRINCIPLES:EXPLICIT_FAILURE`.
- **Idempotency & Dedupe**: `eventId` (UUIDv7, globally unique by construction) is the idempotency key end-to-end — a client-side retry (a flaky mobile connection resending the same `AddedToCart` event) is deduplicated at ingestion by `eventId`, and every Destination adapter is required to pass this same key to its own destination's native deduplication mechanism where one exists (Meta CAPI's `event_id`, GA4's own dedup key) — this is the concrete implementation of `LANDING_ENGINE_ARCHITECTURE.md` §3.5's own "resilient, accurate" server-side tracking claim, generalized from Meta specifically to every destination.
- **`IdentityResolved`** (§3.1): a special, internal-only CDP event — never delivered to an external destination directly — that triggers retroactive identity re-labeling of a bounded recent window of events (not full historical rewrite, an explicit, named scope limit) so a Journey (§8) that started anonymous and resolved to a Guest mid-session reads as one coherent journey, not two disconnected ones.

### 4.5 Event Router — Browser, Server, Hybrid, Offline

- **Browser events**: captured by a lightweight, first-party client SDK (never a third-party tag-manager script loaded from an external origin — keeping this platform's own Content-Security-Policy posture tight, and avoiding the exact "every added app is a new script tag" bloat `LANDING_ENGINE_ARCHITECTURE.md` §2 already diagnosed as an incumbent failure mode), posted to the BFF's own `/api/storefront/events` Route Handler (`STORE_FRONTEND_ARCHITECTURE.md` §3's existing pattern, extended).
- **Server events**: emitted directly by the BFF or backend at the moment a real commerce event occurs (`CheckoutCompleted`, `OrderPlaced`) — never round-tripped through the browser first, which is exactly what makes these resilient to ad-blockers and ITP/ATT in a way pure browser events cannot be.
- **Hybrid events**: a browser event and its server-side counterpart for the *same real action* (e.g. `AddedToCart` fired client-side for immediate UI feedback, plus a server-side confirmation once the cart mutation actually succeeds) — deduplicated via §4.4's shared `eventId` convention, so a destination sees one logical event even though it was technically emitted twice for reliability.
- **Offline events**: a defined ingestion path for events with no live network path at capture time (a PWA/future-mobile-app scenario, `NEXTGEN_FRONTEND_MASTER_PLAN.md` §6.5's own named future mobile roadmap) — queued client-side, flushed on reconnect, `occurredAt` preserving the true original client-side timestamp rather than the flush time, so journey analytics (§8) never misrepresents when something actually happened.

---

## 5. Destinations

### 5.1 Architecture — one more Factory/Registry/Resolver, not a new pattern

Exactly the same shape as `Gateways\Contracts\PaymentGatewayContract`/`GatewayFactory`/`GatewayRegistry`/`GatewayResolver` (Payments) and `Engines\Contracts\SearchEngineContract`/`SearchEngineFactory`/`SearchEngineRegistry`/`SearchEngineResolver` (Search) — both real, proven, already-frozen patterns in this exact codebase. A `DestinationContract` (`send(CdpEvent $event): DeliveryResult`, `isAvailable(): bool` gated on configured credentials, matching Payments' own precedent exactly) is implemented once per destination; adding a new one is "implement the contract, register it," the same acceptance criterion Payments' own module already proved out.

### 5.2 The named destinations

| Destination | Delivery mode |
|---|---|
| **Meta (CAPI)** | Server-side, hashed PII matching (email/phone, SHA-256, never raw), `fbc`/`fbp` cookie values (§7) forwarded for click-attribution matching |
| **Google (GA4 + Enhanced Conversions)** | Hybrid — GA4 via Measurement Protocol server-side calls; Enhanced Conversions via hashed PII on the same server-side path |
| **TikTok (Events API)** | Server-side, `ttclid` (§7) forwarded |
| **Pinterest, Snapchat, LinkedIn, Microsoft Ads** | Server-side, same shape — each a thin `DestinationContract` implementation, no architectural difference from Meta/Google/TikTok beyond field mapping |
| **Custom Webhooks** | A merchant- or agency-configured outbound HTTP endpoint receiving the raw `CdpEvent` JSON — the generic escape hatch every named CDP competitor (§2) also offers, and the direct mechanism a future Marketplace app (`MARKETPLACE_PLATFORM_ARCHITECTURE.md`) would use to receive behavioral events without needing a first-class `DestinationContract` implementation of its own |
| **Warehouse** | Append-only export (a real object-storage sink, R2-compatible per `PERFORMANCE_FOUNDATION.md` §7's own already-confirmed R2 compatibility) — the raw material for §9's future predictive/AI work, and for a merchant's own BI tooling, never processed or filtered before landing here |
| **Future integrations** | Any `DestinationContract` implementation — architecturally unconstrained by this list |

### 5.3 Consent enforcement per destination

Every `DestinationContract` implementation receives the event's own `consent` field (§4.1) and is **required** to self-check it before sending — never relying solely on the Router (§4.5) to have filtered correctly upstream, per `SECURITY:DEFENSE_IN_DEPTH` applied to privacy compliance, exactly as §3.3 already states.

### 5.4 Merchant-Authorable Custom Tracking (the named gap from §2)

A sandboxed "Custom Script" Section-level extension point (proposed, mirroring `THEME_ENGINE_ARCHITECTURE.md` §4's own Theme-Package sandboxing discipline) — a merchant or agency may inject a scoped, CSP-nonce'd script that can *read* `CdpEvent`s as they fire client-side (a `window.nexgen.on('event', ...)` subscription API, read-only) but **cannot** call backend APIs directly or access another Section's own data, mirroring exactly the "no Theme Package fetches its own data" boundary already established. This closes the Shopify-Customer-Events/GTM-shaped gap named in §2 without reopening the security posture Custom Webhooks (§5.2) already handles for the server-side case.

---

## 6. Diagnostics

### 6.1 Merchant Debug Console

A real-time (or near-real-time) admin screen (future build, not this phase) showing the last N events captured, per-destination delivery status (delivered/retrying/DLQ, §4.4), and consent state per session — the direct answer to every incumbent's own "why isn't my pixel firing" support burden, made self-serve.

### 6.2 Event Health & Data Quality

- **Tracking Health Score**: a single, merchant-legible score (not a raw metrics dump) derived from: schema-validation failure rate (§4.2), DLQ rate (§4.4), and destination delivery success rate (§5) — a composite, explicitly documented formula (not a black box), consistent with `PRINCIPLES:EXPLICIT_FAILURE`'s general bias toward legible, actionable signals over opaque scores.
- **Missing Data Detection**: a real, checkable rule set — e.g. "a `checkout_completed` CdpEvent exists for every real `CheckoutCompleted` DomainEvent in the same correlation window" (§4.1's shared `correlationId` is exactly what makes this rule mechanically checkable, not aspirational) — surfaced as a concrete, named gap, never a vague "something might be wrong."
- **Duplicate Detection**: a destination-delivery success that nonetheless recorded two distinct `eventId`s for what data quality analysis (comparing `properties` + a tight time window) determines was likely one real user action — surfaced for merchant awareness, never auto-merged silently (identity/event merges are always explicit, per §3.1's own resolution-event discipline).
- **Broken Conversion Detection**: a `checkout_started` event with no matching `checkout_completed` *or* `checkout_abandoned` within a bounded window, for a session that the real backend's own `CheckoutSession` (confirmed real) shows did in fact reach `submitted` — a genuine tracking bug (not a real abandonment), and a directly checkable inconsistency between the CDP's own event stream and backend ground truth, another place §4.1's `correlationId` linkage earns its keep.

---

## 7. Journey Analytics & Attribution

### 7.1 Journeys

Customer, Campaign, Landing, Checkout, and Purchase/Repeat-Purchase journeys are all **views over the same one event stream** (§4.1), grouped by `identity` (§3.1) and ordered by `occurredAt` — never six separate data models. A "Checkout Journey" is simply every event from `checkout_started` through `checkout_completed`/`checkout_abandoned` for one session; a "Repeat Purchase Journey" is every `order_placed`-correlated event across every session for one resolved Customer Identity. This single-stream-many-views design is what keeps this document's own promise in §1 real — one CDP, not six bolted-together reports.

### 7.2 Attribution

Every ingested browser event (§4.5) captures, once per session (persisted alongside the Session Identity, §3.1, not re-captured on every subsequent event within the same session): `utm_source/medium/campaign/term/content`, `fbclid`, `gclid`, `ttclid`, `wbraid`, `gbraid` (Google's own privacy-preserving click-ID variants for app/web install attribution) — and, separately, the `fbc`/`fbp` cookie pair (Meta's own first-party click/browser identifiers, read if already present from a prior Meta-referred visit, never fabricated). All of this rides in `properties` on the *first* event of a session and is threaded via `sessionId` to every subsequent event in that session — a purchase three pageviews later still attributes correctly to the original campaign click, without needing to re-parse the URL on every event.

---

## 8. AI-Ready Event Model & Future Work

Named, not built, per the master task's own instruction — but the architecture in §§4–7 is deliberately shaped for it already: a stable, versioned, Schema-validated event stream (§4.2–§4.3) landing in an append-only Warehouse (§5.2) is the exact input shape every predictive/ML system needs and none of the incumbent CDPs named in §2 make as cleanly available to a self-hosted deployment. Future predictive analytics, recommendations, anomaly detection (a natural extension of §6.2's own rule-based detection into a learned model), and an AI assistant all consume this same stream through the Extension System (`MODULE:EXTENSIBILITY`), per `VISION:NON_GOALS`'s "additive, never load-bearing" rule, consistent with every other AI-future-extension-point already named across this research initiative.

---

## 9. What This Document Deliberately Does Not Do

- Does not implement anything — architecture only, per this phase's own governing instruction.
- Does not select a specific queue/warehouse vendor beyond confirming Redis (already `ADR-0004`-Accepted) and R2/S3-compatibility (already `PERFORMANCE_FOUNDATION.md`-confirmed) are sufficient — no new infrastructure ADR is required to build this.
- Does not resolve Customer Identity's own backend dependency — inherits `STORE_FRONTEND_ARCHITECTURE.md` §3.3's already-named gap rather than re-deriving it.
- Does not design the Merchant Debug Console's own screens — named as required (§6.1), deferred to a future admin-module build, following this project's own established "research contract, then build UI" sequencing.

---

End of Document
