# neXgen Core — Architecture Review (Phase 1 Complete)

| Field | Value |
|---|---|
| **Report** | Architecture Review — Phase 1 (post-completion) |
| **Date** | 2026-08-08 |
| **Scope** | All 19 implemented backend modules, `deptrac.yaml`, `tests/Arch/ArchitectureTest.php`, the event bus, the permission system, all four provider-abstraction families, SaaS/marketplace/AI extension readiness |
| **Companion documents** | `ARCHITECTURE_REVIEW.md` (2026-08-05, 14-module snapshot), `SECURITY_REVIEW.md`, `PERFORMANCE_REVIEW.md`, `TECHNICAL_DEBT_REPORT.md`, `PHASE1_BACKEND_COMPLETION_REPORT.md`, `CHANGELOG.md`, `PROJECT_STATUS.md` |
| **Method** | Read-only. Direct inspection of `deptrac.yaml`, `docs/04_MODULE_ARCHITECTURE.md` v1.5, the event bus and permission-system source, every provider-abstraction family's source, and repository-wide greps for TODO/FIXME markers, async job classes, rate-limiting middleware, tenant-scoping enforcement, and AI/webhook infrastructure. No code was changed to produce this report. |
| **Verdict** | **No finding below blocks Phase 1's already-formal completion.** This is a forward-looking readiness assessment for Phase 2 and beyond, and an honest accounting of what the Phase 1 Hardening Pass did and did not close out. |

---

## 1. Module Boundaries

19 modules across four domains, each with a formally documented boundary in `docs/04_MODULE_ARCHITECTURE.md` (v1.5) before its own implementation began — `MODULE:AUTHORITY` has been honored without exception for every module built this phase (v1.2 Localization/Installer/Customers, v1.3 Checkout/Payments, v1.4 Notifications, v1.5 Search).

| Domain | Modules |
|---|---|
| Platform | Foundation, Identity & Access, Store Configuration, Media, Localization, Installer |
| Commerce | Catalog, Inventory, Pricing, Promotions, Customers, Orders, Checkout, Payments, **Search** |
| Operations | Shipping, Fulfillment, Returns, Notifications |
| Growth | *(not yet built — by design; see §12)* |

**Boundary discipline is strong and mechanically enforced twice**, not merely documented once:
1. `deptrac.yaml` — 0 violations across the whole codebase, verified fresh this session.
2. `tests/Arch/ArchitectureTest.php` — per-module deny-lists (e.g. "Payments never depends on Catalog, Inventory, Pricing..."), independently re-verified as part of every module's own delivery and again in this session's full 1148-test run.

**Finding B-1 (Low, structural, not a defect):** `deptrac.yaml`'s layers are defined at the **domain** level (`Commerce`, `Operations`, `Growth`, `PlatformOtherModules`), not the **module** level. This was discovered and explicitly exploited during Search's implementation (its listeners live inside its own module namespace rather than the neutral `app/Listeners/` bridge, since Search↔Catalog is same-domain and deptrac never flags it). The practical consequence: **deptrac provides zero automated protection against one Commerce module reaching directly into another Commerce module's internals** (e.g. Search importing Checkout's models, or Promotions importing Orders' models, neither of which deptrac would catch). Today this is fine — every module's actual same-domain coupling is narrow and by-reference (SKU/UUID identifiers, never Eloquent relationships across module lines), enforced by discipline and `tests/Arch/ArchitectureTest.php`'s per-module rules, not by deptrac. As the team or module count grows, this is the first place an accidental same-domain coupling would go undetected by the fastest, most mechanical layer of defense.

**Finding B-2 (Low):** No module-boundary rule is expressed as *"module X may only be imported through its `Http\Resources` / public Action layer, never its `Models` directly."* Every module's own models are technically importable by any other same-domain module today (only the domain boundary is enforced, per B-1). This has not caused an actual violation — same-domain modules that do interact (Search↔Catalog, Inventory↔Catalog, Pricing↔Catalog) all read the owning module's Eloquent models directly by design (a deliberate, repeatedly-chosen pattern for same-domain reads, distinct from the "always reference by identifier, never a live read" rule that governs *cross-domain* coupling). Worth naming as an intentional design choice in `docs/04_MODULE_ARCHITECTURE.md` rather than leaving it implicit.

---

## 2. Dependency Graph

Real, code-level dependencies exercised today (cross-checked against `docs/04_MODULE_ARCHITECTURE.md`'s own dependency lines — the same audit `ARCHITECTURE_REVIEW.md` performed for 12 of these modules on 2026-08-05, extended here to all 19):

```
Platform Foundation ← everything (event bus, health, correlation — the only module with zero dependents-become-dependencies)
Identity & Access   ← everything (auth/permission middleware)
Store Configuration ← Localization (currency/locale reference)
Media                → referenced by identifier from Catalog (logos/images)
Catalog              (leaf — no dependencies)
  ← Inventory (SKU identity)
  ← Pricing (SKU-keyed)
  ← Search (same-domain, direct Eloquent read — new pattern, see §1)
  ← Promotions, Orders, Checkout (by-reference only)
Customers             → Orders (history, by-reference), Identity & Access (Into-Platform)
Orders                → Customers (real, one-time snapshot read)
Checkout              → Catalog, Inventory, Pricing, Promotions, Orders, Customers, Localization (orchestration — the widest fan-in of any module, by design)
Payments              → Orders (real, one-time snapshot read)
Shipping              (zero Commerce dependencies — first Operations module, deliberately decoupled)
Fulfillment           → Shipping (Couriers\ShippingProviderContract, same-domain)
                      ← app/Listeners/CreateShipmentOnOrderPlaced (Orders, cross-domain bridge)
Returns               → Shipping (Couriers\ProviderRegistry, same-domain), Payments (via cross-domain bridge, never direct)
Notifications         (zero Commerce/Operations code-level dependencies — every recipient resolved via 8 cross-domain bridge listeners)
Search                → Catalog (same-domain, direct)
```

**No cycle exists anywhere in this graph.** Every arrow points toward Platform or a domain-peer with a documented, one-directional dependency — a materially healthy property for a monolith at 19 modules that a naive team could easily have let drift into a cycle by module 10 or so.

**Finding B-3 (Low):** The dependency graph has one clear "hub" risk: **Orders**. Checkout, Payments, Fulfillment (transitively, via the cross-domain bridge), Returns (transitively), and Notifications (transitively, via 5 of its 8 listeners) all key off Orders' snapshot data (`customer_email`, `customer_name`, `order_number`). This is architecturally correct (Orders is the natural aggregation point for a commerce platform) and does not violate any boundary — but it does mean Orders' own snapshot-column shape is now a de facto contract touched by 5 other modules' bridge listeners. A breaking change to those column names would have a wide, cross-module blast radius, entirely outside deptrac's or `tests/Arch/ArchitectureTest.php`'s visibility (they check import boundaries, not data-shape contracts). No test currently pins "Orders' snapshot columns are a stable contract" as an explicit, named invariant.

---

## 3. Public Contracts

Every module exposes exactly one of two shapes as its cross-domain-visible surface, consistent platform-wide:

1. **A REST API** under `/api/v1/*`, versioned per `API:VERSIONING`, permission-gated per route.
2. **Domain events**, published through `DomainEventBus`, carrying only what `SECURITY:EVENT_SECURITY` calls "what a subscriber with no special relationship to the publisher needs" — e.g. `ProductCreated` carries `productId`/`sku`/`status`, never the full product.

**Finding B-4 (Low):** There is no single, generated or hand-maintained document enumerating every domain event and its payload shape platform-wide — a new module (or Growth, when it's built) currently has to grep `app/Domains/*/Events/` to discover what it can subscribe to. `docs/04_MODULE_ARCHITECTURE.md` names events per-module in prose, but there is no consolidated event catalog (name → publisher → payload → known subscribers). At 19 modules and roughly 20 domain events today, this is still browsable by hand; it stops being so well before Growth and a Phase 2 module or two are added.

**Finding B-5 (Medium):** No API contract (OpenAPI/Swagger or similar) is generated or hand-maintained anywhere in the repository. `docs/06_API_STANDARD.md` defines the *rules* every API must follow (resource naming, envelope shape, pagination) but there is no machine-readable schema of the ~150+ actual endpoints across 19 modules. This is the single largest gap between "the API standard is well-designed" and "an external consumer — a future admin UI, a future marketplace partner, a future AI agent calling this API — can discover it without reading PHP source." Every `Http\Requests\*Request` class *is* the de facto schema (validation rules map cleanly to a JSON Schema), so generating one is mechanical, not a redesign — but nothing generates it today.

---

## 4. Extension Points & Provider Abstractions

Four independent, structurally identical "provider trio" families exist, confirmed by direct inspection — this is the platform's single most consistent and most valuable extensibility pattern:

| Family | Module | Contract | Registry/Factory/Resolver | Real implementations | Contract-ready, not wired |
|---|---|---|---|---|---|
| Payment Gateways | Payments | `PaymentGatewayContract` | `GatewayRegistry`/`GatewayFactory`/`GatewayResolver` | COD, Bank Transfer, SSLCommerz, bKash, Nagad | — |
| Couriers | Shipping | `ShippingProviderContract` | `ProviderRegistry`/`ProviderFactory`/`ProviderResolver` | Manual, Steadfast, Pathao, RedX, Paperfly, eCourier | Sundarban (no public API to wire) |
| Notification Channels | Notifications | `NotificationProviderContract` | `ProviderRegistry`/`ProviderFactory`/`ProviderResolver` | SMTP, Mailgun, SES, Brevo (email) | SMS, WhatsApp (Phase 2, explicit) |
| Search Engines | Search | `SearchEngineContract` | `SearchEngineRegistry`/`SearchEngineFactory`/`SearchEngineResolver` | MySQL FULLTEXT | Elasticsearch/Meilisearch (never attempted, seam exists) |

Every family follows the identical shape: an interface with `code()`/`label()`/`isAvailable()`, a stateless Registry (storage), a Factory (construction from config), and a Resolver (lookup-with-availability-validation, the only thing calling code ever touches). A new provider in any family is additive — one new class, one new `match` arm in the Factory, one new config block — never a change to the module's own Models or Actions. This pattern was proven correct four separate times across four different problem domains (payment settlement, courier logistics, multi-channel messaging, full-text search) without needing to change shape once.

**Finding B-6 (Low, positive — recorded so it is not lost):** This pattern was never written down as a named, reusable architectural pattern in `docs/09_ENGINEERING_STANDARD.md` or `docs/04_MODULE_ARCHITECTURE.md` — each module's own docblocks say "mirrors Payments' Gateway trio exactly," which works only because every implementer (this session, throughout) manually re-read the prior family before building the next one. A future team member (or a future AI agent extending this codebase) has to discover this convention by finding one of the four instances and reading its docblocks, rather than a single named pattern document. Formalizing it (even a short `docs/patterns/PROVIDER_TRIO.md`) would make this platform's strongest extensibility asset discoverable rather than tacit.

**Finding B-7 (Medium):** No family has more than one *concurrently active* provider selected by anything other than static config (`config('payments.default_gateway')`-shaped values, resolved once at boot). There is no per-request, per-tenant, or per-store provider selection anywhere — e.g. a future multi-store deployment cannot let Store A use bKash and Store B use SSLCommerz simultaneously; the whole installation shares one active gateway set from one `.env`. This is consistent with the platform's current single-tenant, single-store-set reality (see §12) and is not a defect today, but it is the first wall a real SaaS multi-merchant deployment would hit inside every one of these four provider families simultaneously, not just one.

---

## 5. Event Bus

`App\Domains\Platform\Foundation\EventBus\LaravelDomainEventBus` — a thin, `final readonly` adapter over Laravel's native dispatcher. `publish()` is `$dispatcher->dispatch($event)`: **fully synchronous, fully in-process.** Every subscriber runs inline, on the same PHP process, within the same request (or job) that called `publish()`, before `publish()` returns.

This is explicitly, correctly documented as a deliberate Phase 1 choice (`ARCH:CROSS_DOMAIN_COMMUNICATION`: "in-process for Phase 1... no module is permitted to know that"), and the abstraction boundary is real: `deptrac.yaml` confirms `LaravelDomainEventBus` is the *only* class in the entire codebase permitted to touch `Illuminate\Contracts\Events\Dispatcher` directly. A future move to a distributed broker (SQS, a Redis-backed event stream, Kafka) is genuinely an internal swap of this one class, not a redesign of any of the 19 modules that publish or subscribe today — this is a well-designed seam.

**Finding B-8 (Medium):** Synchronous, in-process dispatch means a slow or failing listener directly extends the publisher's response time and, if the publisher wrapped `publish()` inside its own `DB::transaction()` (as most Action classes in this codebase do), a listener exception can affect the publishing transaction unless the listener defensively catches its own exceptions. This exact failure mode was discovered and fixed **twice** this phase — once in Notifications (24 unrelated test failures across 5 modules when 8 new listeners didn't catch their own exceptions) and once, proactively, in Search (applied from the start, having learned the lesson). The pattern is now well-established and every listener follows it — but it is enforced by **convention and code review, not by the framework or by deptrac**. Nothing prevents a Phase 2 listener from omitting the try/catch and reintroducing the exact same class of bug a third time. A shared base class or a lint rule (a custom PHPStan rule flagging a `handle()` method in `*Listeners\*` without a top-level try/catch) would convert this from "a lesson learned twice" into "a lesson the tooling enforces."

**Finding B-9 (Medium — carried architectural risk, not a Phase 1 defect):** At 19 modules and roughly 20 events, synchronous in-process dispatch is invisible to end users (Notifications' own async queue absorbs the one genuinely slow operation — sending email). It stops being invisible the moment a Phase 2 or Growth listener does anything non-trivial (an analytics aggregation, a search-index rebuild larger than a chunked background job, a webhook fan-out to an external marketplace partner) synchronously inside a publisher's request. There is no circuit breaker, no listener-level timeout, and no per-listener metrics (which listener is slow, which one is failing) anywhere in the platform today — `platform:health` checks database/cache/queue connectivity, not event-bus listener latency or failure rate.

---

## 6. Permission System

Flat, role-based, code-defined-then-database-synced: every module owns a `PermissionRegistry::definitions()` (17 copies of this shape across the codebase — see §14), synced into a shared `permissions` table via each module's own `SyncPermissionsCommand`, attached to `roles` (many-to-many), checked at the HTTP boundary by one shared `EnsurePermission` middleware calling Laravel's `Gate` (`$user->can($permission)`). A denial is always an audited, explicit 403 (`AuthorizationDeniedException`), never a silent filter — verified directly in `EnsurePermission`'s source this session.

This is clean, consistent, and — per `MODULE:PUBLIC_CONTRACT`'s "each module owns its own copy" reasoning — a deliberate rejection of a shared permission-definition base class, to keep each module's permission surface independently evolvable. It has held up across 17 modules without a single deviation.

**Finding B-10 (High — the platform's single largest SaaS-readiness gap; see §12):** The permission model has **no tenant, organization, or store dimension at all.** A `Permission` is a global key (`search.products.view`); a `Role` bundles permissions globally; a `User` holds roles globally. There is no concept of "Role R applies only within Store S" or "User U is an admin of Tenant T but has no access to Tenant U." Every permission check today answers "can this user do X anywhere on this installation," never "can this user do X for this specific tenant/store." This is invisible today because the platform has exactly one implicit tenant (see §12) — it is the first and largest structural change multi-tenant SaaS would require of this system, touching the `Permission`/`Role`/`User` schema, `EnsurePermission`, and every one of the ~150 permission-gated routes' *reasoning*, even where the route code itself wouldn't change.

**Finding B-11 (Low):** `RoleSeeder` grants the `Administrator` role literally every permission that exists (`Permission::query()->pluck('id')`), unconditionally, on every `db:seed` run. Correct and necessary for a fresh single-tenant install (documented, deliberate, per that seeder's own docblock) — but it is worth noting explicitly that this pattern would need to become tenant-scoped ("every permission *for this tenant's own modules*") rather than "every permission that exists globally" the moment a second tenant with a different enabled-module set exists.

---

## 7. Search Architecture

Reviewed as a fresh addition (shipped this session) rather than re-litigating implementation detail already covered in `CHANGELOG.md`. Structural assessment:

- **Correctly scoped**: a derived, rebuildable index over Catalog data only, per `DATA:SEARCH_INDEXING`'s "never a second source of truth" rule — `RebuildSearchIndexAction` truncates and repopulates deterministically, proving the "zero information loss on rebuild" acceptance criterion by construction, not merely by claim.
- **Correctly permission-scoped**: `status`/`visibility` hardcoded in `Actions\SearchProductsAction`, never caller-supplied — verified by direct source read this session, not merely by test.
- **The one new architectural pattern this phase introduced** (same-domain listeners living in the module's own namespace, not the neutral bridge) is sound given deptrac's domain-level granularity (§1), but is a second, distinct listener-registration convention now coexisting with the cross-domain bridge pattern. A future contributor must know *which* pattern applies before writing a new listener, based on whether the event's publisher is same-domain or cross-domain — this is documented in Search's own `Providers\SearchServiceProvider` docblock, but (matching Finding B-6) not in any single, named, cross-cutting document.

**Finding B-12 (Medium):** Search has exactly one engine (MySQL FULLTEXT) and exactly one owned entity (`ProductSearchIndex`). The scope decision to exclude Customer/Order/Store/Template/Audit search from this module (resolved with the Product Owner, documented in `docs/04_MODULE_ARCHITECTURE.md` v1.5's Change Log) means "Search," as a named platform capability, today only searches products — every other module's own list endpoint got a small bolted-on `q` LIKE filter instead. This is architecturally correct and intentional (avoids a premature, oversized cross-domain federation), but a future consumer of this platform (an admin UI's global search bar, or a Growth-phase unified search experience) will find "Search" the module and "search across the platform" to be two different things, and that distinction is not obvious from the API surface alone (`GET /api/v1/search/products` reads like it could be the start of a broader `/api/v1/search/*` family, but isn't one today).

**Finding B-13 (Low):** MySQL FULLTEXT's InnoDB-committed-data-only visibility (discovered as a *testing* gotcha this session, documented at length in `CHANGELOG.md`) is also a **production** characteristic worth naming here, not just a test-isolation footnote: a product created and searched for within the same database transaction (not merely the same test) would not find itself until that transaction commits. No code path in this platform currently does that (Catalog's own `CreateProductAction` commits before any caller could plausibly search for the new product), but it is a real, MySQL-specific constraint on any future feature that wants "create and immediately search" semantics inside one transaction.

---

## 8. Notification Architecture

The platform's only genuinely asynchronous module: `Jobs\SendNotificationJob implements ShouldQueue`, a domain-level Retry Policy independent of the queue driver's own retry mechanism (`$tries = 1` deliberately — the Action, not the queue, decides whether to retry), 8 cross-domain bridge listeners each defensively wrapped (the lesson referenced in §5/B-8).

**Finding B-14 (Medium — carried forward, not new):** This is the **only** async job in the entire 19-module platform (confirmed by direct search this session — one `*Job.php` file exists, period). Every other module's every operation — including Search's full index rebuild, Media's file processing, Inventory's stock adjustments, Catalog's bulk operations — runs synchronously, in-request, today. This was an acceptable, deliberate Phase 1 scope choice (nothing else has needed it yet), but it means the queue infrastructure this platform stood up specifically for Notifications (Redis-backed, ADR-0004) is a single-purpose capability rather than a platform-wide one, and any future heavy operation (a large catalog import, a large reindex, a bulk export) will need to either introduce its own new job class from scratch or extend a pattern that currently has exactly one example to learn from.

---

## 9. Future SaaS Readiness

**Assessment: not SaaS-ready today, by explicit Phase 1 design — the gap is well-contained, not scattered.**

The platform's own `TenantId` class (`App\Domains\Platform\Foundation\EventBus\TenantId::DEFAULT`) is deliberately named and documented as "a single well-known tenant identifier for the current, single-tenant installation... designed in and unexercised until real multi-tenancy is built." This is honest, and the containment is real: **63 files** set `tenant_id` on their owned models via this constant, meaning every module's schema already carries the column multi-tenancy would need.

**Finding B-15 (High — the second half of the SaaS-readiness gap, alongside B-10):** No query anywhere in the codebase is scoped by `tenant_id` — confirmed by a repository-wide search for a tenant-scoping global scope, tenant middleware, or per-connection tenant resolution: **none exists.** The column is written on every insert but never read as a filter on any query. This means: (a) the schema is multi-tenant-shaped, but (b) the enforcement layer — a global Eloquent scope, a request-scoped tenant resolver, or equivalent — does not exist at all yet. Building it is additive (a scope + a resolver + a migration to backfill/validate existing `tenant_id` values), not a rewrite, precisely because every model already carries the column — but it is a genuinely new mechanism, not a config flip, and it must land *before* `TenantId::DEFAULT` can be replaced by a real per-request value anywhere.

**Other concrete SaaS blockers, each individually small, collectively real:**
- Provider abstractions (§4, B-7) are installation-wide, not tenant-wide — every family would need tenant-scoped configuration resolution.
- The permission system (§6, B-10) has no tenant dimension.
- `Store` (Store Configuration module) is a business-profile aggregate (currency, locale, address), not a data-isolation boundary — a SaaS "tenant" and this platform's "Store" are different concepts today, and conflating them would be a mistake; a real tenant boundary sits *above* Store, not at it.
- No per-tenant billing, usage metering, or plan/quota concept exists anywhere (expected — this is genuinely Phase 2+ territory, named here only for completeness).

**What is already SaaS-friendly and should not be redone:** the domain-event architecture (tenant-scoping an event bus is additive, not a redesign), the provider-trio pattern (config-driven, easy to make tenant-aware), and the fact that every module already owns its data behind its own migrations with no cross-module foreign keys (`DATA:CROSS_MODULE_ACCESS`) — a real head start, since tenant-isolating 19 independently-owned schemas is mechanically simpler than untangling 19 modules that share tables today.

---

## 10. Future Marketplace Readiness

**Assessment: further from ready than SaaS, and not a named Phase 1 or Phase 2 scope item anywhere in `planning/`.**

A marketplace model (multiple independent sellers/vendors on one platform, each owning their own Catalog subset, Orders split by seller, Payments settled per-seller) is architecturally a *superset* of multi-tenancy — it needs everything in §9 plus:

- **Finding B-16 (Medium):** `Product` (Catalog), `Order` (Orders), and `Payment` (Payments) have no `seller_id`/`vendor_id` concept anywhere in their schemas. Introducing one is a real schema change to the platform's three largest aggregates, not an additive column with a default.
- **Finding B-17 (Medium):** Payments' gateway abstraction (§4) settles to one merchant account per gateway today (bKash/SSLCommerz/Nagad credentials are installation-wide config). Marketplace-style split settlement (a single customer payment divided across multiple sellers) is not a shape any of the four current gateway implementations, or the `PaymentGatewayContract` interface itself, accommodates — this would be new contract surface, not a new implementation of the existing one.
- **Finding B-18 (Low):** Inventory is single-warehouse-scoped in Phase 1 (already documented, already a named future extension in `PROJECT_STATUS.md`) but schema-ready for multi-warehouse. It is *not* schema-ready for multi-seller-owned-warehouse, which is a different dimension again.

None of this is a defect — marketplace was never a Phase 1 or named Phase 2 goal (`planning/reviews/PHASE2_ROADMAP.md` should be checked against this before any marketplace commitment is made, as it is outside this review's read scope to confirm either way). Recorded here only because the user's own review scope named it explicitly.

---

## 11. AI Extension Readiness

**Assessment: a clean slate, not a hostile one — confirmed by direct search (zero AI/ML-specific code exists anywhere in the codebase today), and the existing architecture is unusually well-suited to AI extension precisely because of patterns already proven four times over.**

What already works in AI's favor, without any AI-specific code existing yet:
- **The provider-trio pattern (§4)** is the exact shape an "AI Provider" abstraction would take — an `AiProviderContract` (`generate()`/`embed()`/`isAvailable()`) behind a Registry/Factory/Resolver would be the *fifth* instance of an already four-times-proven pattern, not a new architectural risk.
- **The domain event bus (§5)** means an AI-driven feature (e.g., an LLM-generated product description, an AI-ranked search re-ranker) can subscribe to existing events (`ProductCreated`, `OrderPlaced`) without any existing module needing to know AI involvement exists — the exact decoupling this architecture was built for.
- **Search's engine abstraction (§7)** is the most direct, ready-made seam: a semantic/embedding-based `SearchEngineContract` implementation is a purely additive fifth-and-sixth-style extension (one new class, one new config entry) requiring zero change to `SearchProductsAction`, `IndexProductAction`, or any controller.

**Finding B-19 (Low):** Nothing today generates or stores vector embeddings anywhere, and `ProductSearchIndex`'s schema has no vector/embedding column (expected — never in scope). Any AI-search feature would need either a new owned column on that table or an entirely separate index, and a decision on whether embeddings are Search's own data (consistent with `DATA:SEARCH_INDEXING`'s "derived from the owning module") or a new Growth-domain capability that *consumes* Search's existing FULLTEXT results as one input among several — this decision has not been made or even discussed in any planning document reviewed.

**Finding B-20 (Low):** No API-key/secret-management pattern for a *third-party AI provider specifically* has been exercised yet, though the existing pattern (`SECURITY:SECRETS_MANAGEMENT` — env-only, never database-stored, exactly as every one of the 4 provider families already does for their own credentials) would extend to one without modification. Worth flagging only because AI provider costs/rate-limits are typically more operationally sensitive than the existing providers' (a runaway loop calling an LLM API is a materially different cost-risk profile than a runaway loop calling a courier's rate API), and no cost-governance/kill-switch concept exists anywhere in this platform today for *any* external provider call, AI or otherwise.

---

## 12. Technical Debt

Genuinely new items found this session, beyond what `TECHNICAL_DEBT_REPORT.md` (2026-08-05, 14-module scope) already recorded:

- **Finding B-21 (Low):** **16–17 near-identical duplicated classes** across the codebase, one per module: `HasOptimisticLocking` (16 copies), `AuditLogger` (17 copies), `PermissionRegistry`-shaped classes (17 copies, structurally identical, contents obviously differ). This is the direct, accepted cost of `MODULE:PUBLIC_CONTRACT`'s "each module owns its own copy" principle (avoiding a shared-kernel coupling that would itself be a boundary violation) — not an oversight. It is nonetheless real, quantifiable duplication that a shared **abstract base class living in Platform Foundation** (which every module may already depend on, per the Into-Platform exception — this would not violate any existing rule) could reduce without weakening any module's independent evolvability. Not fixed this session because it is a cross-cutting refactor, not a Search-module or hardening-pass task, and touching 16+ files across every module is explicitly the kind of change that should be its own reviewed, deliberate piece of work — not a drive-by finding remediated inside an unrelated commit.
- **Finding B-22 (Low):** Zero `TODO`/`FIXME`/`@deprecated` markers exist anywhere in `app/` (verified by direct grep) — genuinely clean, and consistent with `TECHNICAL_DEBT_REPORT.md`'s 2026-08-05 conclusion ("materially clean codebase for its size"). Recorded as a positive finding so it is not lost: the discipline held for the additional 5 modules and ~5 more weeks of delivery since that report.

---

## 13. Architectural Debt

- **Finding B-23 (Medium):** No inbound-webhook abstraction exists outside Payments. Payments' own pattern (`ProcessGatewayWebhookAction` + `PaymentWebhookEvent` audit model + per-gateway signature-verifying controllers) is solid and reusable in shape, but it is Payments-specific code, not a Platform Foundation capability. A future Shipping courier-status webhook, or a future Growth ad-platform webhook, would reinvent this rather than extend a shared abstraction — the same "proven pattern, not yet generalized" situation as the provider trio (B-6) and the audit/optimistic-locking duplication (B-21), but for webhooks specifically.
- **Finding B-24 (Low):** No consolidated event catalog exists (restated from B-4, listed here too since it is as much architectural debt as it is a documentation gap).

---

## 14. Performance Risks

- **Finding B-25 (Medium, carried forward — `PERFORMANCE_REVIEW.md`'s P-2, still open):** No performance test suite exists anywhere in the repository — confirmed unchanged since the 2026-08-05 review; this session's hardening pass ran the full *correctness* suite (1148 tests) but did not add or run any load/latency benchmark. See §16 for why this remains open after the hardening pass.
- **Finding B-26 (Medium — new this session):** No blanket API rate limiting exists platform-wide. Confirmed by direct source inspection: only 3 named throttles exist anywhere (`throttle:login`, `throttle:install`, `throttle:payments-webhooks`) and no `RateLimiter::for('api', ...)` configuration exists in `bootstrap/app.php` or any provider. Every other endpoint across all 19 modules — including Search's FULLTEXT query endpoint and its `POST /api/v1/search/reindex` full-rebuild trigger, both potentially expensive — has no request-rate ceiling beyond whatever Laravel's own unconfigured defaults provide (effectively none). This is the same item `SECURITY_REVIEW.md` (S-4) and `TECHNICAL_DEBT_REPORT.md` (TD-3) already flagged on 2026-08-05, explicitly deferred to "the hardening pass" — see §16.
- **Finding B-27 (Low):** Search's `getCountForPagination()` (a `SELECT COUNT(*)`) runs as a separate query from the main paginated `SELECT` on every search request — standard Laravel pagination behavior, consistent with every other list endpoint in this codebase, named here only because FULLTEXT `COUNT(*)` queries are typically more expensive than a plain indexed count, and this platform has no query-result caching layer anywhere (`PERFORMANCE_REVIEW.md`'s P-1, still open, unchanged).

---

## 15. Security Risks

- **Finding B-28 (Medium, carried forward — `SECURITY_REVIEW.md`'s S-5, still open):** No `config/cors.php` exists in this application at all — confirmed by direct file search. The platform runs entirely on Laravel's package default: `allowed_origins => ['*']`, `allowed_methods => ['*']`, `allowed_headers => ['*']`, `supports_credentials => false`. The `supports_credentials: false` half makes this low-exploitability today (Sanctum bearer tokens travel via the `Authorization` header, not cookies, so wildcard-origin CORS cannot be combined with credentialed cookie theft) — but it remains an *unreviewed default*, never a deliberate choice, exactly as flagged on 2026-08-05. Live-verified this session: every smoke-test response carried `Access-Control-Allow-Origin: *`.
- **Finding B-29 (High, found and fixed this session — recorded here for completeness, not as an open item):** The `redirectGuestsTo` authentication bug (full detail in `CHANGELOG.md`) — an unauthenticated request without an `Accept: application/json` header 500'd instead of cleanly 401'ing, on every permission-protected route in every module. **Already fixed** (`bootstrap/app.php`, `$middleware->redirectGuestsTo(fn (): ?string => null)`), verified live, regression-tested, full suite re-passed. Listed here rather than only in the Hardening Pass changelog because it is the clearest evidence in this entire review that **automated test coverage and live behavior are not the same thing** — every one of this platform's 1148 tests uses Pest helpers that always send the header this bug depended on being absent.
- **Finding B-30 (Low):** No cost-governance or abuse-rate concept exists for any external provider call (courier APIs, payment gateway APIs, email/SMS provider APIs) beyond the 3 named throttles in B-26 — a compromised or misbehaving caller with valid credentials could drive real external API cost (a payment gateway call, a courier booking call) at whatever rate the caller can issue HTTP requests. Same root cause as B-26, worth naming as a security concern specifically, not only a performance one, since Payments and Shipping calls have real financial cost per call in a way a Catalog read does not.

---

## 16. Future Migration Risks

- **Finding B-31 (Medium):** The MySQL FULLTEXT choice (Search, ADR-0003-consistent) is the platform's first genuinely storage-engine-specific architectural commitment — every other module's SQL is portable, ordinary Eloquent. A future migration to a different primary datastore (extremely unlikely given ADR-0003's own reasoning, named here only for completeness) would require Search's engine abstraction to gain a second implementation before the first could be retired — which is exactly what that abstraction exists for, so this is a contained, not a systemic, risk.
- **Finding B-32 (Medium):** The synchronous event bus (§5) is the platform's largest single "if we ever need to scale past one deployable unit" migration risk — not because the abstraction is wrong (it is well-designed, per B-8's own assessment), but because **19 modules' worth of listeners have now been written assuming synchronous, immediate, same-process execution**, including assumptions like "the listener's failure doesn't affect the publisher because we wrapped it in try/catch" (true for exceptions, not necessarily true for *latency* — a slow synchronous listener still blocks the publisher's response even if it never throws). Moving to an async broker later means auditing every existing listener for this exact latency assumption, not merely swapping `LaravelDomainEventBus` for a new implementation.
- **Finding B-33 (Low):** The tenant-scoping gap (§9, B-15) is itself the primary migration risk for SaaS — but framed here as a *migration* risk specifically: retrofitting tenant scoping onto 63 files' worth of existing models, after real production data exists in a single-tenant shape, is a materially harder migration than building it in from the start would have been. This is not a criticism of the Phase 1 decision (building single-tenant-only first, with the column pre-provisioned, was the documented and reasonable choice) — it is a flag that the cost of this migration grows with every day of production data accumulated before it is undertaken, and should be sequenced deliberately rather than left indefinitely.

---

## 17. Findings Summary

| ID | Severity | Finding | Status |
|---|---|---|---|
| B-1 | Low | Deptrac boundaries are domain-level, not module-level | Open — structural, by design |
| B-2 | Low | No explicit "models are not a public contract" rule | Open — undocumented convention |
| B-3 | Low | Orders' snapshot columns are an unpinned de facto contract, touched by 5 modules | Open |
| B-4 | Low | No consolidated domain-event catalog | Open |
| B-5 | Medium | No machine-readable API contract (OpenAPI) for ~150+ endpoints | Open |
| B-6 | Low | Provider-trio pattern proven 4x but never named as a formal pattern | Open |
| B-7 | Medium | Provider abstractions are installation-wide, not tenant-aware | Open — SaaS blocker |
| B-8 | Medium | Listener try/catch discipline is convention-enforced, not tool-enforced | Open |
| B-9 | Medium | No listener-level latency/failure observability on the event bus | Open |
| B-10 | **High** | Permission system has no tenant/organization dimension | Open — largest SaaS blocker |
| B-11 | Low | `RoleSeeder` grants all permissions unconditionally, global-scope only | Open — will need tenant-scoping |
| B-12 | Medium | "Search" only means Product search; other modules' search is separately bolted on | Open — by design, not obvious from API alone |
| B-13 | Low | MySQL FULLTEXT committed-data-only visibility is a production constraint, not just a test gotcha | Open — informational |
| B-14 | Medium | Notifications is the only async module in the whole platform | Open |
| B-15 | **High** | No tenant-scoping enforcement anywhere despite 63 files carrying `tenant_id` | Open — largest SaaS blocker |
| B-16 | Medium | No seller/vendor concept on Product/Order/Payment | Open — marketplace blocker |
| B-17 | Medium | No split-settlement capability in any payment gateway | Open — marketplace blocker |
| B-18 | Low | Inventory is multi-warehouse-ready but not multi-seller-warehouse-ready | Open — marketplace blocker |
| B-19 | Low | No decision made on where AI embeddings would live | Open — not yet needed |
| B-20 | Low | No cost-governance/kill-switch for any external provider call | Open |
| B-21 | Low | 16–17 near-identical duplicated classes across modules | Open — accepted trade-off |
| B-22 | — | Zero TODO/FIXME markers anywhere in `app/` | **Positive finding** |
| B-23 | Medium | No generalized inbound-webhook abstraction outside Payments | Open |
| B-24 | Low | (duplicate of B-4, architectural framing) | Open |
| B-25 | Medium | No performance test suite (carried from `PERFORMANCE_REVIEW.md` P-2) | **Still open after hardening pass** |
| B-26 | Medium | No blanket API rate limiting (carried from `SECURITY_REVIEW.md` S-4 / `TECHNICAL_DEBT_REPORT.md` TD-3) | **Still open after hardening pass** |
| B-27 | Low | No query-result caching anywhere (carried from `PERFORMANCE_REVIEW.md` P-1) | Open |
| B-28 | Medium | No reviewed CORS config, running on wildcard-origin default (carried from `SECURITY_REVIEW.md` S-5 / TD-4) | **Still open after hardening pass** |
| B-29 | High | `redirectGuestsTo` 500-instead-of-401 bug | **Fixed this session** |
| B-30 | Low | No cost-governance for external provider calls (security framing of B-20) | Open |
| B-31 | Medium | MySQL FULLTEXT is the platform's first storage-engine-specific commitment | Open — contained risk |
| B-32 | Medium | Synchronous event bus assumption baked into every existing listener | Open — largest scaling migration risk |
| B-33 | Low | Tenant-scoping retrofit cost grows with production data volume | Open — sequencing risk |

**Severity counts: 3 High (2 open, 1 fixed this session), 15 Medium (all open), 14 Low (13 open, 1 positive), 1 Fixed.**

---

## 18. An Honest Accounting: What the Phase 1 Hardening Pass Did and Did Not Close

The Hardening Pass that immediately preceded this review ran the full automated verification pipeline (Pest, PHPStan, Deptrac, Pint, `migrate:fresh --seed`, health checks) clean, and — critically — live smoke testing caught and fixed a genuine, previously-undetected, platform-wide 500-vs-401 bug (B-29) that the entire 1148-test automated suite was structurally blind to. That is a real, valuable result, and the single clearest demonstration in this codebase's history of why live verification is a distinct step from a green test suite.

It did **not** close out three items that two prior review documents (`SECURITY_REVIEW.md`, `PERFORMANCE_REVIEW.md`, `TECHNICAL_DEBT_REPORT.md`, all dated 2026-08-05) explicitly deferred to "the hardening pass" as their intended resolution point:

- **B-26 / rate limiting** (S-4 / TD-3)
- **B-28 / CORS review** (S-5 / TD-4)
- **B-25 / performance test suite** (P-2)

This is recorded plainly, not to relitigate the hardening pass that already ran and was already accepted, but because an architecture review that omitted it would be incomplete. These three items remain genuinely open, carried forward from before this phase closed, not newly discovered — and they are the most actionable, best-understood items in this entire report (each has a known, bounded fix: a `RateLimiter::for('api', ...)` definition, a reviewed `config/cors.php`, and a small `k6`/Pest-based load-test suite, respectively).

---

## 19. Recommendations (Ordered by Leverage, Not Just Severity)

1. **Close B-26 and B-28** (rate limiting, CORS) — both small, both already twice-flagged, both genuinely security-relevant even at Low/Medium exploitability today. The lowest-effort, highest-integrity items to close before any external-facing deployment.
2. **Decide the tenant-scoping approach (B-10, B-15) before any SaaS commitment, not during one.** This is the largest single piece of unstarted architectural work this review found, and its cost only grows with production data volume (B-33). It does not need to be *built* before Phase 2 — it needs to be *designed*, so every Phase 2 module is built against a real plan rather than deepening the gap.
3. **Name the provider-trio pattern (B-6) and write the shared Platform Foundation base classes for `HasOptimisticLocking`/`AuditLogger` (B-21) together, as one piece of work.** Both are "a pattern proven multiple times, never formalized" — the same root cause, the same fix shape (a short pattern doc + a Platform Foundation base class every module may already depend on).
4. **Generate the OpenAPI contract (B-5)** — mechanical, given every `Http\Requests\*Request` already encodes the schema, and it is the single biggest unlock for any future consumer of this API (an admin UI, a marketplace partner, an AI agent) that doesn't require reading PHP source first.
5. **Do not build AI-specific infrastructure speculatively.** Per §11, the architecture is already well-positioned; the right sequencing is to let a real AI feature request drive the fifth provider-trio instance, not to build one in advance of a need.

---

*This report is read-only in origin: no source file, configuration, or test was modified to produce it. Findings B-1 through B-33 reflect the state of the repository at commit `b1081b8036d9d3bc83314ca36208d92b7bf25c70` (tag `v1.0.0-phase1`).*
