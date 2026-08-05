# neXgen Core — Performance Review

| Field | Value |
|---|---|
| **Report** | Performance Review |
| **Date** | 2026-08-05 |
| **Scope** | All 14 implemented modules |
| **Companion** | `PHASE1_BACKEND_COMPLETION_REPORT.md` |

---

## 1. Methodology

No dedicated load or performance test suite exists yet — this is itself a finding (§4). This review is therefore a structural assessment: does the architecture avoid the known classes of performance defect (N+1 queries, transactions held across external I/O, unbounded result sets, missing indexes on hot paths), not a measured-throughput benchmark.

---

## 2. Structural Findings — Positive

- **No transaction ever spans an external network call.** Checkout's `SubmitCheckoutAction` and Payments' `InitiatePaymentAction` and `ProcessGatewayWebhookAction` are the two places in the codebase where a saga coordinates work across modules or calls an external gateway; both are explicitly designed (and documented in their own docblocks) to never hold a database transaction or row lock open across an HTTP call to another module's action or an external payment gateway. This is the single most important performance property in a system with 5 external payment integrations and a multi-step checkout saga — a slow or hung external call cannot hold a database lock indefinitely.
- **Idempotency and duplicate-protection checks are row-locked (`lockForUpdate()`), not table-scanned.** Every claim-style check (Checkout's session claim, Payments' duplicate-payment check, `ProcessGatewayWebhookAction`'s replay check) locks a single row or a small indexed range, not a broader table scan.
- **bKash's OAuth-style token is cached against its own TTL** (`Cache::put` keyed by `md5($app_key)`, expiring 60s before the gateway's own `expires_in`), avoiding a redundant Grant Token round-trip on every single API call — the only place in the codebase where an external round-trip could otherwise happen far more often than necessary, and it was specifically caught and fixed during Payments' own delivery.
- **Foreign-key and status columns are consistently indexed.** Spot-checked across every module's migrations: every `*_id` foreign-key-style column and every `status` column used in a `WHERE` clause by an Action or a list endpoint carries an index (either a standalone index or as the leading column of a composite index alongside `tenant_id`).
- **List endpoints paginate.** Every `index()` controller method across all 14 modules returns a paginated `AnonymousResourceCollection`, never an unbounded `all()`.
- **Eager loading is used correctly on `show()` endpoints that expose relations** (e.g. `Order::load(['items', 'addresses', 'discounts', 'notes', 'timelineEvents'])`, `Payment::load('attempts')`), avoiding N+1 on the one-object-with-children read path; `index()` endpoints intentionally do not eager-load child collections they don't return, avoiding unnecessary joins.
- **Background/batch work is genuinely batched, not per-request.** Checkout's `checkout:expire-sessions` and Payments' `payments:reconcile` are console commands intended for scheduled execution, each processing one aggregate instance per transaction (never one giant transaction for a whole batch, per `DATA:TRANSACTION_BOUNDARIES` applied at the per-instance level) — this keeps any single lock held briefly even when the batch itself is large.

---

## 3. Structural Findings — Gaps

- **Finding P-1 (Low): No application-level query-result caching yet.** Redis is wired and used for the platform's cache store, sessions, and queue, but no module caches a frequently-read, rarely-written value (e.g. Localization's locale/currency list, Catalog's category tree) behind it. Not a defect at Phase 1's expected single-store scale — every read observed in review is already indexed and paginated — but worth revisiting once Search and a real storefront read path exist.
- **Finding P-2 (Medium, hardening-pass item): No performance test exists.** `TESTING:PERFORMANCE_TESTING` and `TESTING:REVIEW_CHECKLIST`'s "any performance claim about it is backed by a performance test, not asserted from intuition" are not satisfied anywhere in the test suite. Every performance statement in this report (including this one) is a structural/code-reading judgment, not a measured one. This is explicitly the kind of gap the master plan's hardening pass exists to close, not an individual module's responsibility.
- **Finding P-3 (Low): The five per-item stock-resolution queries in `Checkout\Actions\ReviewCheckoutAction` and `Payments\Actions\InitiatePaymentAction`'s SKU lookup are O(n) in cart size, not batched.** Documented as an accepted, deliberate trade-off in both modules' own docblocks at delivery time ("acceptable at Phase 1 checkout cart sizes... a candidate for a later pass, not a blocker") — restated here for completeness, not as a new finding.

---

## 4. Multi-Store / SaaS / ERP Performance Readiness

- **Multi-store:** every query that would need to scope by store currently scopes by `tenant_id = 'default'` implicitly (no query anywhere filters on a real, varying tenant value yet, since only one exists). The column and index exist; the query patterns are already `WHERE tenant_id = ? AND ...` shaped, so introducing a real second store would not require rewriting query shapes, only populating a real value — but this claim is untested, since no second tenant has ever existed in this database to prove the index actually protects performance at scale under multiple tenants.
- **SaaS:** the event bus (`LaravelDomainEventBus`) is explicitly documented as swappable for a distributed broker without redesign, per `ARCH:CROSS_DOMAIN_COMMUNICATION` — but this has never been exercised; the claim is architectural, not proven under load.
- **ERP:** the audit-log-plus-attempt-ledger pattern (every module) gives any future ERP integration a complete, append-only change history to reconcile against without needing new instrumentation — a structural strength, not yet exercised by an actual ERP integration.

---

## 5. Findings Summary

| ID | Severity | Finding | Blocking Phase 1 completion? |
|---|---|---|---|
| P-1 | Low | No query-result caching layer yet | No |
| P-2 | Medium | No performance test suite exists | No — hardening-pass scope |
| P-3 | Low | O(n) per-item stock/SKU lookups in Checkout/Payments (already documented, accepted trade-off) | No |

**No finding in this review constitutes a critical defect preventing Backend Phase 1 completion.** The architecture avoids every major class of performance defect a reviewer would look for at this stage; what is missing is measurement (a performance test suite), which is correctly scoped to the hardening pass rather than any individual module.
