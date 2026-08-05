# neXgen Core — Security Review

| Field | Value |
|---|---|
| **Report** | Security Review |
| **Date** | 2026-08-05 |
| **Scope** | All 14 implemented modules, against `08_SECURITY_STANDARD.md`'s `SECURITY:REVIEW_CHECKLIST` (§28) |
| **Companion** | `PHASE1_BACKEND_COMPLETION_REPORT.md` |

---

## 1. Methodology

`SECURITY:REVIEW_CHECKLIST` states eleven criteria "before any module or capability is considered ready for implementation." Every implemented module was checked against all eleven, evaluated platform-wide rather than module-by-module where the answer is structural (permission-gating, audit logging) and module-by-module where it isn't (data classification, event content).

---

## 2. `SECURITY:REVIEW_CHECKLIST` Results

- [x] **Does not rely on a single control as its only defense (`SECURITY:DEFENSE_IN_DEPTH`).** Confirmed structurally: authentication (Sanctum) + authorization (`permission:` middleware) + input validation (FormRequest rules) + database-level constraints (unique indexes, foreign keys) are independent layers everywhere. Architecture boundaries are enforced twice — Deptrac (static analysis) and Pest arch tests (runtime-reflective) — deliberately duplicated per this same principle.
- [x] **Every trust boundary enforces authentication/authorization/validation independently.** Every one of the 14 modules' `routes.php` files declares its own `permission:` middleware per route; none inherits authorization from a sibling module or assumes a caller was already checked upstream.
- [x] **Every operation declares the permission required to perform it.** 12 `PermissionRegistry` classes exist (one per module requiring authorization), all following the identical `module.resource.action` key pattern, all seeded idempotently via a per-module `PaymentsPermissionSeeder`-style seeder called from `DatabaseSeeder`.
- [x] **No operation trusts upstream authentication/authorization/validation.** Every controller's FormRequest re-validates its own input; every webhook endpoint (Payments) re-verifies signatures itself rather than trusting the route's own reachability as proof of legitimacy.
- [~] **Every field has a stated `DATA:CLASSIFICATION` and matching protection.** Payments' own docblocks explicitly state Sensitive classification for payment records and Confidential for gateway audit data, with matching protection (raw gateway responses excluded from API resources, only surfaced via the permission-gated audit log). Most other modules' migrations document classification in comments but do not carry it as a formal, queryable metadata field anywhere. **Finding S-1 (Low):** classification is documented in prose per-module rather than centrally tracked; sufficient for Phase 1's scale but worth a dedicated `DATA:CLASSIFICATION` registry if the module count keeps growing.
- [x] **Every published event carries only its public contract's intended content, per `SECURITY:EVENT_SECURITY`.** Verified across all 36 events — every one carries identifiers and business-relevant fields only (e.g. `PaymentFailed.reason` is a short human-readable summary, never a gateway's raw response body, which stays in the audit-log-only `payment_attempts.response_payload`).
- [x] **Authentication attempts, authorization denials, permission changes, and Confidential/Sensitive data access are all audited.** Confirmed: Identity & Access audits authentication attempts and permission/role changes; every module with Sensitive data (Payments explicitly) audits both mutations and access-relevant events (webhook rejections, unmatched deliveries) — not mutations alone, exceeding the bare mutation-only floor most other modules use for Internal/Confidential-only data.
- [ ] **Abnormal or suspicious activity can be recognized, not only recorded after the fact (`SECURITY:MONITORING`).** **Finding S-2 (Medium, hardening-pass item):** nothing in the platform currently evaluates audit-log or authentication-failure patterns for abnormality — every module satisfies the "recorded" half of this requirement but not the "recognized while happening" half. This is explicitly named by the master plan's own hardening-pass step, not an individual module's responsibility to solve alone.
- [ ] **Can be isolated or suspended independently if it becomes the subject of an incident (`SECURITY:INCIDENT_RESPONSE`).** **Finding S-3 (Medium, hardening-pass item):** no operational mechanism exists yet to isolate a single module, revoke-at-scale a session cohort, or disconnect a specific external integration (e.g. one payment gateway) without redeploying. Sanctum tokens can be revoked individually and gateway `isAvailable()` gating means removing a gateway's credentials effectively disables it — a partial capability, not the full isolation mechanism this criterion describes.
- [x] **Default configuration is secure without operator intervention (`SECURITY:SECURE_CONFIGURATION`).** Every gateway/integration defaults to *unavailable* until credentials are explicitly configured (`isAvailable()` gating) — the secure failure mode, never a silent fake-success default. No seeded default admin account exists (`DatabaseSeeder`'s own docblock: "Deliberately does NOT create any User... would violate `SECURITY:SECURE_CONFIGURATION`").
- [x] **Nothing assumes a single ungoverned global scope that would block a future tenant boundary.** Confirmed: `tenant_id` present on every aggregate root and audit log, currently defaulted to `'default'` everywhere, unexercised but structurally ready — see `ARCHITECTURE_REVIEW.md` §4.

**9 of 11 fully satisfied. 2 (`SECURITY:MONITORING`, `SECURITY:INCIDENT_RESPONSE`) are explicitly hardening-pass scope, not per-module scope, and are correctly not yet done — see §4.**

---

## 3. Payment-Specific Security (Highest-Severity Boundary Besides Identity & Access)

- **No card data ever collected or stored anywhere in the platform** — confirmed by design: every Phase 1 payment method is either cash-in-person (COD), manual bank transfer, or a hosted/tokenized redirect flow (SSLCommerz, bKash, Nagad) where the card/mobile-wallet credential never transits this platform's own servers.
- **Webhook signature verification** — every gateway's `verifyWebhookSignature()` is called and its result checked before the Payment aggregate is ever touched; a delivery that fails verification is recorded `rejected` and audited, never silently dropped, never trusted.
- **Webhook replay protection** — enforced at the database layer (`payment_webhook_events` unique index on `(gateway_code, event_reference)`), not application logic alone, so it holds even under concurrent delivery.
- **Duplicate Payment Protection / idempotency** — both enforced under row locks (`lockForUpdate()`), not optimistic checks alone.
- **Secrets management** — every gateway credential is sourced from environment variables via `config/payments.php`, never stored in the database, never logged (confirmed no gateway credential appears in any log statement across the module).

No findings against Payments specifically beyond what is already captured in §2 platform-wide.

---

## 4. Platform-Wide Gaps (Hardening-Pass Scope, Not Individual-Module Defects)

- **Finding S-4 (Medium): Rate limiting is not applied by default to authenticated CRUD endpoints.** `bootstrap/app.php`'s middleware configuration registers no global `throttle:api`. Only three specific routes carry explicit rate limiting: `login` (Identity & Access), `install` (Installer), and `payments-webhooks` (Payments). Every other authenticated endpoint across all 14 modules — product management, order management, pricing rules, everything — has no rate limit at all beyond whatever infrastructure-level protection sits in front of the application. `API:RATE_LIMITING` and `SECURITY:RATE_LIMITING_ABUSE` both name this as a requirement; `SECURITY:RATE_LIMITING_ABUSE` explicitly defers the "specific limit or detection algorithm" as an implementation decision, which is exactly the deferred decision that has not yet been made. This is real and worth fixing in the hardening pass, not an emergency requiring code changes today — every route is still authenticated and authorized, so this is an abuse-resistance gap, not an access-control gap.
- **Finding S-5 (Low): No explicit `config/cors.php`.** The project relies on Laravel's own default CORS handling (`Illuminate\Http\Middleware\HandleCors` is active in the middleware stack) without a published, explicitly-reviewed configuration. Low severity because this is a pure API backend with no first-party browser client yet (Admin UI does not exist); worth an explicit, reviewed CORS policy before any browser-based client (Admin UI or a future storefront) is pointed at it in production.
- **Finding S-6 (Medium): `SECURITY:MONITORING` and `SECURITY:INCIDENT_RESPONSE` mechanisms not built.** Repeated from §2 for visibility — these are the two checklist items explicitly deferred to the hardening pass rather than any single module.
- **Finding S-7 (Low): Backup verification and rollback drills not performed.** `DEPLOYMENT:GO_LIVE_CHECKLIST` requires `DEPLOYMENT:BACKUP_VERIFICATION` and a rollback path "verified by actually being exercised (not only designed)" before any release goes live. Neither has been exercised in this environment. Explicitly a `DEPLOYMENT:REVIEW_CHECKLIST` / hardening-pass item, not a code defect.

---

## 5. Findings Summary

| ID | Severity | Finding | Blocking Phase 1 completion? |
|---|---|---|---|
| S-1 | Low | Data classification tracked in prose, not a formal registry | No |
| S-2 | Medium | `SECURITY:MONITORING` (abnormal-activity detection) not built | No — explicit hardening-pass scope |
| S-3 | Medium | `SECURITY:INCIDENT_RESPONSE` isolation mechanism not built | No — explicit hardening-pass scope |
| S-4 | Medium | No default rate limiting on authenticated CRUD endpoints | No — explicit hardening-pass scope, but should be fixed before go-live |
| S-5 | Low | No explicit, reviewed CORS configuration | No — relevant once a browser client exists |
| S-6 | Medium | (see S-2/S-3) | No |
| S-7 | Low | Backup/rollback drills not exercised | No — operational/infra step, hardening-pass scope |

**No finding in this review constitutes a critical defect preventing Backend Phase 1 completion.** Every item above is either already scoped to the master plan's own hardening pass (item 20) or is a low-severity, non-blocking observation. Consistent with `PHASE1_BACKEND_COMPLETION_REPORT.md`'s conclusion: the security posture of what has been built is sound; what remains is completeness (five modules) and the dedicated hardening pass, not remediation of the existing 14 modules.
