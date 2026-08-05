# neXgen Core — Architecture Review

| Field | Value |
|---|---|
| **Report** | Architecture Review |
| **Date** | 2026-08-05 |
| **Scope** | 14 implemented modules, constitutional documents `00`–`11`, ADRs, `deptrac.yaml`, `tests/Arch/ArchitectureTest.php` |
| **Companion** | `PHASE1_BACKEND_COMPLETION_REPORT.md` |

---

## 1. Constitutional Document Status

All twelve governing documents (`00_PROJECT_GOVERNANCE` through `11_DEPLOYMENT_STANDARD`) are **Accepted**. `03_SYSTEM_ARCHITECTURE_PLAN.md` is a superseded planning draft, correctly marked "closed out" and replaced by `03_SYSTEM_ARCHITECTURE.md`.

Of the eight ADRs, six are **Accepted** (0001 Modular Monolith, 0002 Backend Runtime, 0003 Primary Datastore, 0004 Caching/Session/Queue, 0007 API Style, 0008 Containerized Deployment). Two remain **Draft**:

- **ADR-0005 (Admin Interface — React + TypeScript)** — the decision itself is already written and unambiguous; only the governance status field is outstanding.
- **ADR-0006 (Storefront Rendering)** — same situation.

**Finding A-1 (Low severity):** Neither ADR blocks backend work — nothing in the 14 implemented modules depends on either decision. ADR-0005 specifically should be formally Accepted before Admin UI development begins, since `PHASE1_BACKEND_COMPLETION_REPORT.md`'s recommendation explicitly gates Admin UI on Backend Phase 1 completion, and it would be an odd order of operations to build against a still-Draft interface-technology decision.

---

## 2. Module Boundary and Dependency Consistency

`docs/04_MODULE_ARCHITECTURE.md` names a dependency line for every implemented module. Cross-checked against each module's actual code (constructor injections, model queries reaching outside the module's own namespace) and against `deptrac.yaml` + `tests/Arch/ArchitectureTest.php`'s per-module deny-lists:

| Module | Documented dependency | Real code-level dependency exercised | Consistent? |
|---|---|---|---|
| Identity & Access | Platform Foundation only | None beyond Foundation | ✅ |
| Store Configuration | Identity & Access | None (permission middleware only, platform-wide) | ✅ |
| Media | Foundation, Identity & Access | None beyond middleware | ✅ |
| Catalog | (none — leaf module) | None | ✅ |
| Inventory | Catalog | Catalog (SKU identity) | ✅ |
| Localization & Currency | Store Configuration | None beyond middleware | ✅ |
| Customers | Orders (history), Identity & Access (auth, Platform exception) | Identity & Access only, by-reference | ✅ |
| Pricing | Catalog | Catalog (SKU-keyed) | ✅ |
| Promotions | Catalog, Pricing, Customers | All three, by-reference only | ✅ |
| Orders | Catalog, Pricing, Promotions, Customers | **Customers only**, real code-level (one-time snapshot read) | ✅ — the others stay reference-by-identifier, exactly as documented |
| Checkout | Catalog, Inventory, Pricing, Promotions, Orders, Customers, Localization | All seven, real code-level (orchestration is the module's stated purpose) | ✅ |
| Payments | Orders only | Orders only, real code-level (one-time snapshot read) | ✅ |

Every dependency line in the architecture document matches what the code actually does. No module reaches into a sibling it isn't documented to depend on. `deptrac analyse` confirms this mechanically: **0 violations** across 670 analyzed files. `tests/Arch/ArchitectureTest.php`'s independent, second enforcement layer (per `SECURITY:DEFENSE_IN_DEPTH` — "no individual mechanism is permitted to be the platform's only defense") agrees: **96 passed**.

**No findings.** This dimension is clean.

---

## 3. MODULE:STABILITY Classification Completeness

**Finding A-2 (Medium severity, found and corrected during this review):** `Payments` had no `MODULE:STABILITY` classification anywhere in `04_MODULE_ARCHITECTURE.md` §8, despite `MODULE:AUTHORITY` requiring every module named in §§4–7 to carry one. This was a genuine gap from the module's own delivery, not a design decision. **Corrected** in this review: `Payments` added to the Evolvable list, with a Change Log entry (v1.3) explaining the correction. `Checkout`'s classification was already correctly present.

No other implemented module is missing a classification. Current state: Identity & Access and Store Configuration are Core; Catalog, Inventory, Orders, Media, and Localization & Currency are Stable; Pricing, Promotions, Checkout, Payments, Customers, and Installer are Evolvable — all consistent with each module's actual change-risk profile as observed during this session's iterative delivery (Checkout and Payments both had real design corrections mid-flight; Catalog and Orders did not).

---

## 4. Data Architecture Consistency

Spot-checked across all 14 modules' migrations, models, and audit infrastructure:

- **Optimistic locking (`DATA:VERSIONING`):** every aggregate root carries `lock_version`, a per-module `HasOptimisticLocking` trait, and a per-module `ConcurrencyConflictException` mapped to HTTP 409. Verified present in Identity & Access, Store Configuration, Media, Catalog, Inventory, Localization, Customers, Pricing, Promotions, Orders, Checkout, and Payments (Installer has no aggregate that requires it — a single-shot, one-time operation). Consistent.
- **Audit logging (`DATA:AUDIT_DATA`):** 12 dedicated `<module>_audit_logs` tables exist (plus the base `audit_logs` for Identity & Access itself), one per module that mutates data. Every one follows the identical shape: `actor_id`, `action`, `target_type`, `target_id`, `before`/`after` JSON, `correlation_id`, immutable (`UPDATED_AT = null`). Consistent.
- **Multi-tenant seam (`ARCH:DATA_OWNERSHIP`):** `tenant_id` (default `'default'`) is present on every aggregate-root and audit-log table — 46 of 70 migrations. The 24 without it are either framework tables (`cache`, `jobs`, `personal_access_tokens`), pivot tables, or **child entities of an already tenant-scoped parent** (`order_items`, `order_addresses`, `checkout_items`, `promotion_conditions`, `price_list_entries`, `customer_addresses`, `product_*` pivots). This is the correct, intentional pattern — a child row's tenant is its parent's tenant, not a value that needs its own column — **with one inconsistency**: `payment_attempts` *does* carry its own `tenant_id` despite being exactly this kind of child entity, unlike every other child table in the codebase.
  **Finding A-3 (Low severity):** `payment_attempts.tenant_id` is redundant (Payments' aggregate root already carries it) and inconsistent with the pattern every other child table (`order_items`, `checkout_items`, etc.) follows. Harmless — it is always correctly populated and never queried in isolation — but worth normalizing away in a future Payments migration cleanup rather than treated as a live defect.
- **Snapshot pattern:** Orders freezes Customer name/email/phone/address at order-creation time; Checkout freezes address JSON the same way; Payments freezes Order's `grand_total`/`currency_code`/`customer_id` at initiation time. All three follow the identical "read once, freeze, never re-read" discipline `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` and each module's own docblocks describe. Consistent.

---

## 5. API Consistency

All 14 modules' `routes.php` files register under the identical `Route::prefix('api/v1')` — no module uses a different version prefix or an unversioned route. 12 of 14 modules require `auth:sanctum`; the two that don't (Identity & Access's own login/register, Installer) are correctly pre-authentication flows, not an oversight. Every protected route carries a specific `permission:` middleware naming the exact operation it gates — no route relies on `auth:sanctum` alone. Response envelope (`{"data": ...}` / `{"error": {"type", "message", "details?"}}`) is identical across every controller, defined once in `bootstrap/app.php`'s exception-rendering closure and reused by every module's own exception mappings.

**No findings.** This dimension is clean and mechanically enforceable — any future module deviating from this shape would be immediately visible in a diff against every prior module's `routes.php`.

---

## 6. Event Architecture

36 domain events are defined and published across the 14 modules (`PaymentCaptured`, `OrderPlaced`, `CustomerRegistered`, etc.), every one extending the shared `DomainEvent` envelope and following the `module.aggregate.event_name` naming convention.

**Observation A-4 (informational, not a defect):** Zero event **subscribers** exist anywhere in application code — `grep -r "->subscribe("` across `app/Domains` returns no matches. Every module publishes; nothing yet consumes. This is architecturally correct for what has been built so far — Orders never needed to react to Checkout (Checkout calls `CreateOrderAction` directly, which is orchestration, not an event reaction), and Payments deliberately does not call back into Orders on `PaymentCaptured` (documented in both modules as a decision left to whichever future module owns that business rule). It is not a defect. It does mean, however, that the event bus's *consumption* side — `LaravelDomainEventBus::subscribe()` — has never been exercised end-to-end outside its own Platform Foundation unit tests. **Fulfillment** (reacting to `OrderPlaced`/`PaymentCaptured`) and **Notifications** (reacting to nearly everything) will be the first modules to genuinely exercise this path — worth treating as first-class new-integration risk when those modules are built, not assumed to work from the publish side alone having been proven.

---

## 7. Extension Mechanism

`MODULE:EXTENSIBILITY_MECHANISM` (the formal extension-registration/lifecycle/event-subscription contract) is correctly not yet built — it is Phase 2 scope per the master plan, and `04_MODULE_ARCHITECTURE.md` itself classifies `Extensibility` as Experimental "specifically because its concrete mechanism... is newly defined in this document and not yet exercised by any real extension." Every module built so far documents its own genuine extension points in code (`Gateways\Contracts\RefundableGateway`, `config('payments.cod.fee')`, Checkout's `ShippingOptionCatalog` seam) without inventing a parallel, premature extensibility framework. Consistent with the project's stated discipline.

---

## 8. Findings Summary

| ID | Severity | Finding | Status |
|---|---|---|---|
| A-1 | Low | ADR-0005/0006 still Draft, not Accepted | Open — resolve ADR-0005 before Admin UI |
| A-2 | Medium | Payments missing `MODULE:STABILITY` classification | **Fixed during this review** |
| A-3 | Low | `payment_attempts.tenant_id` inconsistent with sibling child-table pattern | Open — cosmetic, non-blocking |
| A-4 | Informational | Event bus subscribe() path unexercised outside unit tests | Open — expected to be exercised by Fulfillment/Notifications |

No finding in this report rises to "prevents Backend Phase 1 completion." The gap that does prevent it — five missing modules — is a completeness gap, not an architecture-quality defect, and is covered in full in `PHASE1_BACKEND_COMPLETION_REPORT.md`.
