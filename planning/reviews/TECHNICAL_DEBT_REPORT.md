# neXgen Core — Technical Debt Report

| Field | Value |
|---|---|
| **Report** | Technical Debt Report |
| **Date** | 2026-08-05 |
| **Scope** | All 14 implemented modules |
| **Companion** | `PHASE1_BACKEND_COMPLETION_REPORT.md` |

---

## 1. Methodology

"Technical debt" here means code or documentation that will cost more to fix later than it would cost to fix now, and that was not a deliberate, documented trade-off. This report deliberately separates genuine debt from documented Future Extension Points — a seam a module's own docblock names as intentionally deferred to a later module is not debt, it is the architecture working as designed.

---

## 2. Debt Found

Searched every module for `TODO`, `FIXME`, `XXX:`, `dd(`, `dump(`, `var_dump(`, and dead/unreachable code.

**Result: none found anywhere in `app/Domains`.** No TODO comments, no debug statements, no commented-out code blocks, no unreferenced classes. This is a genuinely clean result across 668 PHP files and confirms the module-by-module delivery discipline (each module's own completion report required an explicit "no debug code, no dead code, no temporary files" check before commit) held consistently across all 14 modules, not just the most recent ones.

The only debt items this review found are the ones already named in the other companion reports:

| ID | Source | Item | Estimated cost to fix now | Estimated cost if deferred |
|---|---|---|---|---|
| TD-1 | `ARCHITECTURE_REVIEW.md` A-2 | Payments missing `MODULE:STABILITY` classification | Trivial | **Fixed during this review** |
| TD-2 | `ARCHITECTURE_REVIEW.md` A-3 | `payment_attempts.tenant_id` redundant/inconsistent with sibling child tables | Trivial (one migration) | Low — cosmetic, never grows harder to fix |
| TD-3 | `SECURITY_REVIEW.md` S-4 | No default rate limiting on authenticated CRUD endpoints | Low (one `RateLimiter::for` + middleware group) | Grows with traffic — cheapest to fix before real load exists |
| TD-4 | `SECURITY_REVIEW.md` S-5 | No explicit, reviewed `config/cors.php` | Low | Grows once Admin UI/storefront exist as real browser clients |
| TD-5 | `PERFORMANCE_REVIEW.md` P-2 | No performance test suite | Medium (needs a chosen tool + baseline scenarios) | Grows significantly — retrofitting performance tests after problems appear is much more expensive than establishing a baseline now |
| TD-6 | This report, §3 | `04_MODULE_ARCHITECTURE.md` catalog entry for Analytics carries a Phase-1 tag inconsistent with the Release Roadmap's own module list | Trivial (one-line doc edit) | Trivial — purely a documentation clarity issue |

None of these are large. None require an architectural redesign. All are the kind of item that belongs in the hardening pass (item 20 of the master plan's own Implementation Order), which is precisely why the master plan schedules a dedicated pass rather than trusting each module's own, narrower verification to catch platform-wide concerns.

---

## 3. Documentation Debt

- `04_MODULE_ARCHITECTURE.md`'s Analytics entry (§28, catalog numbering) states "Phase: 1 (basic reporting) / Phase 2 (dashboards) / Phase 3 (advanced analytics)," but Analytics does not appear in the master plan's own "Implementation Order (Phase 1)" numbered list or its "Release Roadmap → Phase 1 — Version 1.0" module list. One of the two is wrong. Given the Release Roadmap is the more operationally authoritative statement of what a v1.0 release actually contains, the fix is almost certainly to amend the catalog entry's Phase tag (e.g. to "Phase 2 (basic reporting) / Phase 2 (dashboards) / Phase 3 (advanced)"), not to add Analytics to Phase 1's build list this late. This report does not make that edit — it is a Product Owner / governance-process decision under `GOVERNANCE:CHANGE_MANAGEMENT`, not a review artifact's call to make unilaterally.
- `04_MODULE_ARCHITECTURE.md`'s Change Log had fallen one version behind its own body content (Checkout and Payments were both documented in the module list, in the module descriptions, without a matching Change Log entry or, for Payments, any `MODULE:STABILITY` classification at all). **Corrected during this review** — see the doc's own v1.3 Change Log entry.
- `ADR-0005` and `ADR-0006` remain formally Draft despite their decisions being final and already built against (ADR-0005) or planned against (ADR-0006). Not a defect in the decisions themselves, but a governance-process gap — see `ARCHITECTURE_REVIEW.md` A-1.

---

## 4. What Is NOT Debt (Explicitly, So It Is Not Mistaken For It Later)

The following are deliberate, documented extension points named in the code they belong to — reviewed and confirmed genuine (not placeholders masquerading as extension points):

- `Gateways\Contracts\RefundableGateway` (Payments) — implemented today only by `BkashGateway`, real and functional, awaiting the future Returns module to call it.
- `config('payments.cod.fee')` and the neighboring COD-by-zone/store/product/customer-group/risk-rule seams (Payments) — named in configuration, not implemented, exactly as the master plan scoped them.
- `Support\ShippingOptionCatalog` (Checkout) — explicitly documented as "this module's own temporary, fully-functional (not fake) shipping mechanism pending a future Shipping & Logistics module," the exact seam that module replaces.
- `MODULE:EXTENSIBILITY_MECHANISM` — correctly not built; Phase 2 scope, and `04_MODULE_ARCHITECTURE.md` itself classifies the `Extensibility` module Experimental for exactly this reason.

None of these require any action. They are named here only so a future reviewer does not mistake "there is an unimplemented interface method" for debt when it is, in every one of these cases, the architecture's own documented design.

---

## 5. Findings Summary

| ID | Severity | Item | Blocking Phase 1 completion? |
|---|---|---|---|
| TD-1 | — | Payments `MODULE:STABILITY` gap | **Fixed** |
| TD-2 | Low | `payment_attempts.tenant_id` inconsistency | No |
| TD-3 | Medium | No default rate limiting | No — hardening-pass scope |
| TD-4 | Low | No reviewed CORS config | No |
| TD-5 | Medium | No performance test suite | No — hardening-pass scope |
| TD-6 | Low | Analytics Phase-tag documentation inconsistency | No — documentation-only |

**Total technical debt across 14 modules and 668 PHP files: six items, all Low or Medium severity, none requiring architectural rework.** This is a materially clean codebase for its size. The reason Backend Phase 1 is not complete (`PHASE1_BACKEND_COMPLETION_REPORT.md`) is unbuilt scope, not accumulated debt in what has been built.
