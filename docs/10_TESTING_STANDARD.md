# neXgen Core
## 10_TESTING_STANDARD

| Field | Value |
|---|---|
| **Title** | Testing Standard |
| **Document ID** | TESTING |
| **Version** | 1.1 |
| **Status** | Accepted |
| **Author** | Chief Software Architect & Lead Engineer (independently reviewed and approved by Product & Solution Architect) |
| **Last Updated** | 2026-08-01 |
| **Parent Document** | 09_ENGINEERING_STANDARD |
| **Related Documents** | 00_PROJECT_GOVERNANCE, 01_PRODUCT_VISION, 02_PRODUCT_PRINCIPLES, 03_SYSTEM_ARCHITECTURE, 04_MODULE_ARCHITECTURE, 05_DATA_ARCHITECTURE, 06_API_STANDARD, 07_UI_DESIGN_SYSTEM, 08_SECURITY_STANDARD |
| **Applies To** | Every module, API, interface, and release the platform produces |

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.1 | 2026-08-01 | Initial draft | First Testing Standard draft |
| 1.0 | 2026-08-01 | Status changed to Accepted following independent review by the Product & Solution Architect and Product Owner approval | Completed the Document Lifecycle defined in `GOVERNANCE:DOCUMENT_LIFECYCLE` |
| 1.1 | 2026-08-01 | Added `TESTING:RISK_BASED_TESTING` (new §5: testing effort proportional to business, architectural, security, and operational impact) and `TESTING:TEST_ISOLATION` (new §18: tests are independent, order-independent, repeatable, no reliance on leftover state); renumbered §§5–22 to §§6–24 accordingly; strengthened `TESTING:DEFECT_CLASSIFICATION` with "classification may change as new evidence emerges, but every change must be explicit, justified, and traceable"; strengthened `TESTING:QUALITY_GATES` with "must be objective, repeatable, and evidence-based — never dependent on individual judgment alone"; added 2 Review Checklist items. Version incremented per `GOVERNANCE:CHANGE_MANAGEMENT`, since this document was already Accepted at v1.0 before this round of refinements | Independent review requested these refinements after initial acceptance; no other architectural changes were made |

---

# 1. Purpose

**Identifier: TESTING:PURPOSE**

This document defines the platform-wide testing constitution: what must be verified, and to what standard, before any change is considered done. It is not a testing framework guide — it names no library, no test runner, no CI tool. Every guarantee `00`–`09` establish — a module boundary, a data rule, an API contract, a security control, an engineering standard — is only as real as the platform's ability to verify it holds. This document is that verification's constitution.

---

# 2. Scope

**Identifier: TESTING:SCOPE**

This document covers testing philosophy, the testing pyramid, unit testing, integration testing, contract testing, end-to-end testing, regression testing, performance testing, scalability testing, security testing, accessibility testing, usability validation, test data management, environment strategy, release verification, defect classification, and quality gates.

It does **not** name a testing framework, a testing library, CI/CD tooling, or any other implementation detail. A drafter who finds themselves naming a specific tool or writing an actual test has drifted out of scope — this document defines what testing must accomplish, not how any specific test is written or run.

---

# 3. Authority

**Identifier: TESTING:AUTHORITY**

This document is subordinate to `00_PROJECT_GOVERNANCE`, `01_PRODUCT_VISION`, `02_PRODUCT_PRINCIPLES`, `03_SYSTEM_ARCHITECTURE`, `04_MODULE_ARCHITECTURE`, `05_DATA_ARCHITECTURE`, `06_API_STANDARD`, `07_UI_DESIGN_SYSTEM`, `08_SECURITY_STANDARD`, and `09_ENGINEERING_STANDARD`. It exists to verify that those documents' guarantees hold in practice — it introduces no new architectural or product direction of its own.

Every test strategy applied to neXgen Core must be consistent with this document. If verifying a specific guarantee is found to require an approach this document does not provide for, this document is revised through `GOVERNANCE:CHANGE_MANAGEMENT` first.

---

# 4. Testing Philosophy

**Identifier: TESTING:PHILOSOPHY**

- **Testing verifies, it does not merely accompany.** A guarantee stated in `00`–`09` that no test verifies is, in practice, unverified — this document exists because `ENGINEERING:PHILOSOPHY`'s "production-first" commitment is only real if what ships has been checked against what was promised.
- **An untested change is an unfinished change.** Testing is not a phase that follows development — it is part of what makes a change complete, the same way `ENGINEERING:DOCUMENTATION_STANDARD` makes a module's contract part of what makes it complete, not an afterthought appended to it.
- **A skipped or ignored test is a silent failure.** Per `PRINCIPLES:EXPLICIT_FAILURE`, a test that is disabled, skipped, or whose failure is routinely ignored is functionally the same as no test at all, and worse — it creates the appearance of verification where none exists.
- **Tests verify contracts, not implementations.** Consistent with `MODULE:PUBLIC_CONTRACT`, a test that depends on a module's internal implementation rather than its public contract breaks every time that implementation is refactored, even when nothing observable has changed — this is a test design failure, not evidence that the refactor was unsafe.

---

# 5. Risk-Based Testing

**Identifier: TESTING:RISK_BASED_TESTING**

Testing effort is proportional to what is actually at stake, not distributed evenly across everything by default. Four factors determine how much verification a change warrants:

- **Business impact** — how directly a change affects `VISION:MISSION`'s outcomes and a merchant's ability to operate, per `PRINCIPLES:MERCHANT_FIRST`.
- **Architectural impact** — how much of `MODULE:COUPLING_RULES`, `ARCH:DOMAIN_MAP`, or `DATA:AGGREGATE_BOUNDARIES` a change touches; a change confined within one module's internal logic warrants less scrutiny than one crossing a module or domain boundary.
- **Security impact** — whether a change touches anything `08_SECURITY_STANDARD` governs, particularly Confidential or Sensitive data (`DATA:CLASSIFICATION`) or a security boundary (`SECURITY:SECURITY_BOUNDARIES`).
- **Operational impact** — how a change affects `ENGINEERING:OBSERVABILITY` and `ENGINEERING:RESILIENCE` once running, not only its correctness in isolation.

A change touching a Core or Stable module (`MODULE:STABILITY`) warrants more verification than the same category of change touching an Experimental one — this is the testing-effort application of the same stability logic `04_MODULE_ARCHITECTURE` already applies to review overhead. This section states the principle only; it names no specific testing technique or effort-allocation formula.

---

# 6. Testing Pyramid

**Identifier: TESTING:TESTING_PYRAMID**

Verification is weighted toward many fast, narrow tests and away from few slow, broad ones — a large base of tests verifying small units of behavior, a smaller layer verifying how components interact, and the smallest layer verifying complete workflows end to end. This shape exists so that feedback on whether a change is correct arrives quickly, supporting `ENGINEERING:OBSERVABILITY` and `ENGINEERING:RESILIENCE`'s emphasis on fast detection — a testing strategy inverted from this shape (many slow, broad tests and few fast, narrow ones) produces slow, expensive feedback, which works directly against `PRINCIPLES:PREDICTABLE_UPGRADES`'s commitment that applying change should be routine, not feared.

---

# 7. Unit Testing

**Identifier: TESTING:UNIT_TESTING**

A unit test verifies a single module's internal business logic in isolation — the largest layer of `TESTING:TESTING_PYRAMID`. Because `MODULE:PUBLIC_CONTRACT` already guarantees a module's internal implementation may change freely as long as its contract holds, unit tests exercise that internal logic directly and are expected to change alongside it; a unit test that reaches across a module boundary to verify something has, in practice, become an integration test wearing the wrong name.

---

# 8. Integration Testing

**Identifier: TESTING:INTEGRATION_TESTING**

An integration test verifies that two or more components actually work together the way their contracts promise — that `MODULE:INTERACTION_RULES` and `MODULE:COUPLING_RULES` are honored in practice, not only in code review. This is where cross-domain communication through domain events (`ARCH:CROSS_DOMAIN_COMMUNICATION`) is verified to actually propagate and actually get handled, not merely assumed to.

---

# 9. Contract Testing

**Identifier: TESTING:CONTRACT_TESTING**

A contract test verifies that a module's public contract (`MODULE:PUBLIC_CONTRACT`) or API surface (`06_API_STANDARD`) actually matches what it claims to offer — that the documented OpenAPI schema (`API:DOCUMENTATION`) reflects real behavior, not aspirational behavior. This is the concrete mechanism that makes `MODULE:STABILITY` and `API:BACKWARD_COMPATIBILITY` enforceable rather than aspirational: a contract test failing on an unintended change is the detection `ENGINEERING:DOMAIN_BOUNDARY_ENFORCEMENT` already requires exist, applied specifically to contracts.

---

# 10. End-to-End Testing

**Identifier: TESTING:E2E_TESTING**

An end-to-end test verifies a complete business workflow, crossing module and domain boundaries, from a caller's perspective — the smallest and most expensive layer of `TESTING:TESTING_PYRAMID`, used deliberately sparingly because of that cost, not because the workflows it covers matter less. It exists to catch what unit and integration tests, by their narrower scope, cannot: that the pieces genuinely deliver the outcome `01_PRODUCT_VISION` describes when assembled together, not merely that each piece is individually correct.

---

# 11. Regression Testing

**Identifier: TESTING:REGRESSION_TESTING**

A previously verified behavior — including a previously fixed defect — remains verified going forward; regression testing is the mechanism that makes `PRINCIPLES:PREDICTABLE_UPGRADES` and `ENGINEERING:BACKWARD_COMPATIBILITY` more than a stated intention. An upgrade that silently reintroduces previously fixed behavior has violated both, and regression testing exists specifically to catch that before it reaches a merchant.

---

# 12. Performance Testing

**Identifier: TESTING:PERFORMANCE_TESTING**

Performance testing produces the evidence `ENGINEERING:PERFORMANCE_ENGINEERING` already requires any performance-motivated change to be justified by — verifying, under realistic load, that the properties `ARCH:NFR` states the system must exhibit actually hold, rather than being assumed from design intent. A performance claim with no corresponding performance test is not yet a verified claim.

---

# 13. Scalability Testing

**Identifier: TESTING:SCALABILITY_TESTING**

Distinct from `TESTING:PERFORMANCE_TESTING`'s single-configuration focus, scalability testing verifies that adding an additional instance of the Application Unit or a Background Worker (`ARCH:DEPLOYMENT_TOPOLOGY`) actually increases the system's capacity, confirming that `ENGINEERING:SCALABILITY_PRINCIPLES`'s statelessness requirement holds in practice and not only in code review.

---

# 14. Security Testing

**Identifier: TESTING:SECURITY_TESTING**

Security testing verifies that `08_SECURITY_STANDARD`'s requirements actually hold — that authentication and authorization cannot be bypassed (`SECURITY:AUTHENTICATION`, `SECURITY:AUTHORIZATION`), that invalid input is actually rejected (`SECURITY:INPUT_VALIDATION`), and that a security boundary (`SECURITY:SECURITY_BOUNDARIES`) cannot be crossed undetected. This is the verification layer for `SECURITY:REVIEW_CHECKLIST` — confirming a security requirement was actually achieved, not only declared satisfied at review time.

---

# 15. Accessibility Testing

**Identifier: TESTING:ACCESSIBILITY_TESTING**

Accessibility testing verifies that `UI:ACCESSIBILITY`'s baseline — keyboard operability, screen-reader support, sufficient contrast, visible focus, respect for reduced-motion preference — actually holds for real interfaces as built, not only as designed. A design that satisfies `07_UI_DESIGN_SYSTEM`'s accessibility requirements on paper has not met this document's standard until that has been verified against the actual interface.

---

# 16. Usability Validation

**Identifier: TESTING:USABILITY_VALIDATION**

Distinct from accessibility testing (which verifies an interface is usable at all), usability validation verifies that `UI:DESIGN_PHILOSOPHY`'s conversion-friendly and fast commitments hold for real people actually using the interface. This is the one area of this document where qualitative human feedback, not only pass/fail assertions, is an expected and necessary part of verification — a workflow can pass every automated check and still fail a real person's expectation of how quickly and clearly it should work.

---

# 17. Test Data Management

**Identifier: TESTING:TEST_DATA_MANAGEMENT**

Test data is never real Confidential or Sensitive data (`DATA:CLASSIFICATION`) used without the same protections `SECURITY:DATA_PROTECTION` requires of that classification in any other context — a testing environment is not an exemption from data protection, only a different context it still applies in. Test data must be resettable and reproducible, so that a test's outcome depends on the change being verified, not on the accumulated, undocumented state of whatever data happened to be present when it ran.

---

# 18. Test Isolation

**Identifier: TESTING:TEST_ISOLATION**

Every test is independent: it does not depend on another test having already run, does not depend on the order tests happen to execute in, and does not depend on state left behind by a prior test. A test is repeatable — running it twice under the same conditions produces the same result. A test that only passes when run after another specific test, or only passes the first time it runs in an environment, has not verified anything reliably; it has produced a result that happened to be true under conditions this document does not guarantee will recur.

This directly supports `TESTING:TEST_DATA_MANAGEMENT`'s reproducibility requirement and `PRINCIPLES:EXPLICIT_FAILURE`: an isolation failure that causes a test to pass or fail depending on execution context is itself a silent, undiagnosed source of false signal, not a property of the system under test.

---

# 19. Environment Strategy

**Identifier: TESTING:ENVIRONMENT_STRATEGY**

Testing occurs in environments that mirror the architecture `03_SYSTEM_ARCHITECTURE` and `04_MODULE_ARCHITECTURE` actually describe — the same domain boundaries, the same event-based cross-domain communication (`ARCH:CROSS_DOMAIN_COMMUNICATION`) — closely enough that a passing test is meaningful evidence about production behavior, not merely about the test environment's own behavior. An environment that diverges from the platform's actual architectural shape produces false confidence, which is itself the kind of silent failure `PRINCIPLES:EXPLICIT_FAILURE` prohibits — a test passing for the wrong reason is not meaningfully different from a test that never ran.

---

# 20. Release Verification

**Identifier: TESTING:RELEASE_VERIFICATION**

`GOVERNANCE:DELIVERY_LIFECYCLE` already names Verification as a distinct stage between Implementation and Release. This document makes that stage concrete: a release does not proceed until the verification appropriate to what it changes — the relevant layers of `TESTING:TESTING_PYRAMID`, plus `TESTING:SECURITY_TESTING` and `TESTING:REGRESSION_TESTING` at minimum — has passed. A release that skips this stage under time pressure has not completed the Delivery Lifecycle `GOVERNANCE:DELIVERY_LIFECYCLE` already requires, regardless of how confident anyone feels about it informally.

---

# 21. Defect Classification

**Identifier: TESTING:DEFECT_CLASSIFICATION**

A defect is classified by its actual impact, not by an arbitrary or inconsistently applied severity label: a defect that violates a security guarantee (`08_SECURITY_STANDARD`), a data-integrity rule (`05_DATA_ARCHITECTURE`), or an API contract (`06_API_STANDARD`) is treated with more urgency than a defect confined to presentation. A defect touching a Core or Stable module (`MODULE:STABILITY`) carries more urgency than the same category of defect touching an Experimental one, consistent with the elevated review those classifications already require elsewhere.

Defect classification may change as new evidence emerges, but every classification change must be explicit, justified, and traceable. A defect initially classified as low-impact that is later found to touch a security boundary or a Core module is reclassified openly, with the reason recorded — never silently upgraded or downgraded without a stated basis, which would make the classification's history untrustworthy for anyone reviewing it later.

---

# 22. Quality Gates

**Identifier: TESTING:QUALITY_GATES**

A change does not proceed past a defined point in `GOVERNANCE:DELIVERY_LIFECYCLE` unless the testing this document requires for that kind of change has passed. A quality gate is evidence-based: it exists to confirm, with test results, the same five dimensions `ENGINEERING:CODE_REVIEW_STANDARD` already requires a review to evaluate — correctness, maintainability, architectural conformity, security implications, and operational impact — rather than accepting a reviewer's confidence in place of that evidence.

A quality gate must be objective, repeatable, and evidence-based — never dependent on individual judgment alone. The same change, evaluated against the same gate twice, produces the same pass-or-fail outcome regardless of who is evaluating it; a gate whose outcome depends on which person applies it is not a gate, it is an opinion wearing a gate's name. This does not remove judgment from the review process `ENGINEERING:CODE_REVIEW_STANDARD` describes — it ensures the gate itself, as distinct from the broader review, rests on evidence a different reviewer could verify independently.

---

# 23. Test Review Checklist

**Identifier: TESTING:REVIEW_CHECKLIST**

Before any change is considered adequately tested, it must satisfy:

- [ ] The depth of testing applied to it is proportional to its business, architectural, security, and operational impact, not applied uniformly regardless of stakes (`TESTING:RISK_BASED_TESTING`).
- [ ] Unit tests verify its internal logic without reaching across a module boundary (`TESTING:UNIT_TESTING`).
- [ ] Integration tests verify any cross-component interaction it introduces or touches actually behaves as `MODULE:INTERACTION_RULES` requires (`TESTING:INTEGRATION_TESTING`).
- [ ] If it changes a public contract, a contract test verifies the documented contract matches actual behavior (`TESTING:CONTRACT_TESTING`).
- [ ] Previously verified behavior it could plausibly affect has been re-verified, not assumed unaffected (`TESTING:REGRESSION_TESTING`).
- [ ] Any performance claim about it is backed by a performance test, not asserted from intuition (`TESTING:PERFORMANCE_TESTING`).
- [ ] Any security-relevant surface it introduces or touches has been verified against `08_SECURITY_STANDARD`, not only reviewed (`TESTING:SECURITY_TESTING`).
- [ ] Any interface it introduces or touches has been verified against `UI:ACCESSIBILITY`, not only designed to it (`TESTING:ACCESSIBILITY_TESTING`).
- [ ] Test data used to verify it contains no unprotected Confidential or Sensitive data (`TESTING:TEST_DATA_MANAGEMENT`).
- [ ] Its tests are independent, order-independent, and repeatable, with no reliance on leftover state (`TESTING:TEST_ISOLATION`).
- [ ] Its defect classification, if any were found and fixed during development, reflects actual impact, and any change to that classification is explicit and justified (`TESTING:DEFECT_CLASSIFICATION`).

---

# 24. Acceptance Criteria

**Identifier: TESTING:ACCEPTANCE_CRITERIA**

This document is ready for Accepted status only when:

1. It has been reviewed for internal consistency and consistency with `00`–`09`.
2. No testing framework, testing library, CI/CD tool, or other implementation detail appears anywhere in the document.
3. Every rule is traceable to a specific citation in an already-accepted document, not introduced as free-standing testing opinion.
4. The Product Owner has confirmed this document does not constrain the product beyond what `03_SYSTEM_ARCHITECTURE` and `04_MODULE_ARCHITECTURE` already do.

Individual changes made later are considered adequately tested only when they satisfy the Test Review Checklist in `TESTING:REVIEW_CHECKLIST` in full.

---

End of Document
