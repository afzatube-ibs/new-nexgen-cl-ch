# neXgen Core
## 06_API_STANDARD

| Field | Value |
|---|---|
| **Title** | API Standard |
| **Document ID** | API |
| **Version** | 1.0 |
| **Status** | Accepted |
| **Author** | Chief Software Architect & Lead Engineer (independently reviewed and approved by Product & Solution Architect) |
| **Last Updated** | 2026-08-01 |
| **Parent Document** | 05_DATA_ARCHITECTURE |
| **Related Documents** | 00_PROJECT_GOVERNANCE, 01_PRODUCT_VISION, 02_PRODUCT_PRINCIPLES, 03_SYSTEM_ARCHITECTURE, 04_MODULE_ARCHITECTURE |
| **Applies To** | Every current and future API surface any module exposes |

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.1 | 2026-08-01 | Initial draft | First API Standard draft |
| 1.0 | 2026-08-01 | Added `API:CORRELATION` (new §9: purpose of platform-wide request/correlation identifiers, no mechanism specified) and `API:RATE_LIMITING` (new §20: architectural philosophy only, no algorithms or limits specified); renumbered §§9–25 to §§10–27 accordingly; strengthened `API:PHILOSOPHY`'s opening statement from "The API is the only door" to "Every externally accessible capability of the platform must be exposed through the API"; added two Review Checklist items covering the new sections. Status changed to Accepted following independent review by the Product & Solution Architect and Product Owner approval | Independent review requested these refinements; no other architectural changes were made |

---

# 1. Purpose

**Identifier: API:PURPOSE**

This document defines the rules every API a module exposes must follow. It is not an API specification — it names no endpoint, no resource, no payload shape belonging to any specific module. It is the constitution an API specification is written against, the same relationship `04_MODULE_ARCHITECTURE` has to a future implementation.

The API is the mechanism through which `MODULE:PUBLIC_CONTRACT` becomes reachable from outside the platform: every capability a storefront, an admin interface, or a third party can use is, definitionally, something a module has published through its API. Nothing else is reachable.

---

# 2. Scope

**Identifier: API:SCOPE**

This document covers: API philosophy, resource naming, HTTP method semantics, versioning, idempotency, the error model, response envelope standards, pagination, filtering, sorting, field selection and expansion, batch operations, long-running operations, authentication integration points, authorization expectations, event publication principles, backward compatibility, deprecation policy, documentation requirements, and API stability levels.

It does **not** define concrete endpoints, controllers, DTOs, framework-specific code, or database queries, and it does not leak implementation detail belonging to `09_ENGINEERING_STANDARD.md` or any future module-specific API specification. A drafter who finds themselves naming a route, a class, or a query while writing this document has drifted out of scope.

---

# 3. Authority

**Identifier: API:AUTHORITY**

This document is subordinate to `00_PROJECT_GOVERNANCE`, `01_PRODUCT_VISION`, `02_PRODUCT_PRINCIPLES`, `03_SYSTEM_ARCHITECTURE`, `04_MODULE_ARCHITECTURE`, and `05_DATA_ARCHITECTURE`. It treats `ARCH:TECHNOLOGY_DECISIONS` §9.1 (REST, documented via OpenAPI) as an already-accepted architectural constraint, not a decision open for reconsideration here — per `GOVERNANCE:TECHNOLOGY_LEAKAGE`, this document may therefore reference REST and OpenAPI directly without that being a scope violation. Every rule below operationalizes that constraint; none of them reopen it.

Every future module-specific API specification must be consistent with this document. If a future specification is found to require violating a rule here, this document is revised through `GOVERNANCE:CHANGE_MANAGEMENT` first — the rule is never silently bent to fit a specification that was written without it in mind.

---

# 4. API Philosophy

**Identifier: API:PHILOSOPHY**

- **Every externally accessible capability of the platform must be exposed through the API.** Per `ARCH:DEPLOYMENT_TOPOLOGY`, the storefront and admin interfaces reach the backend exclusively through the API — there is no other channel, and no future frontend or integration is permitted one either.
- **An API surfaces a contract, never an implementation.** An API exposes exactly what `MODULE:PUBLIC_CONTRACT` says a module has published — never internal storage shape, internal field names, or anything else that would let a caller depend on how a module happens to work today.
- **One system, not a federation of styles.** Per `PRINCIPLES:CONSISTENCY_OVER_NOVELTY`, a caller moving from one module's API to another's should not need to relearn conventions. Every rule in this document exists to make that true.
- **Failure is explicit.** Per `PRINCIPLES:EXPLICIT_FAILURE`, an API never lets a caller believe an operation succeeded when it did not, and never hides a conflict, a validation failure, or a permission denial behind an ambiguous response.

---

# 5. Resource Naming Conventions

**Identifier: API:RESOURCE_NAMING**

A resource corresponds to an aggregate (`DATA:AGGREGATE_BOUNDARIES`) or an explicitly published read model of one, never to an arbitrary internal grouping of data. Resource names are nouns, not verbs — an action is expressed through the HTTP method (`API:HTTP_METHODS`), not encoded into the resource name. Nesting a resource under another is permitted only where it reflects genuine ownership already established in `MODULE:DEFINITION` or `DATA:OWNERSHIP` — nesting for caller convenience, without a real ownership relationship behind it, is not permitted, since it would misrepresent the platform's actual data ownership to every API consumer.

Naming must be consistent across every module's API surface — casing convention, pluralization, and identifier placement are platform-wide decisions, not a per-module style choice, per `PRINCIPLES:CONSISTENCY_OVER_NOVELTY`.

---

# 6. HTTP Method Semantics

**Identifier: API:HTTP_METHODS**

REST's standard method semantics apply platform-wide and are not reinterpreted per module: a read method never causes a side effect; a creation method is not treated as safe to repeat without an idempotency mechanism (`API:IDEMPOTENCY`); an update method changes only the resource addressed, never a different resource as a side effect; a removal method triggers the owning module's `DATA:LIFECYCLE` Deleted state — what that means concretely (archival vs. erasure) is the owning module's decision, not this document's, but the method's meaning at the API boundary is uniform.

Every write operation, regardless of method, must respect `DATA:TRANSACTION_BOUNDARIES` — a single API request never requires changes to more than one aggregate to succeed. An operation that appears to need this should be reconsidered as more than one request, consistent with the same rule at the data layer.

---

# 7. Versioning Strategy

**Identifier: API:VERSIONING**

The API is versioned at the surface level, not resource-by-resource — a caller integrates against a stated version of the platform's API, not a patchwork of independently-versioned resources. A previous version remains supported for a defined window after a new version is published, consistent with `PRINCIPLES:PREDICTABLE_UPGRADES` and `VISION:PLATFORM_PROMISES`'s commitment that upgrades preserve what already works; that window's length is a policy decision for a future document, not fixed here.

How freely a version may introduce breaking changes depends on the stability of the modules it exposes (`MODULE:STABILITY`, and `API:STABILITY_LEVELS` below) — a version touching only Core or Stable modules carries a stronger compatibility expectation than one touching only Experimental modules.

---

# 8. Idempotency Rules

**Identifier: API:IDEMPOTENCY**

Any operation that creates or mutates state must be safely retryable without duplicating its effect, using a caller-supplied idempotency mechanism for creation operations in particular. A retried request that used the same idempotency mechanism must return the same outcome as the original request, not create a second copy of whatever was created.

This directly supports `DATA:VERSIONING`'s conflict-detection requirement: a retry following a network failure must never be indistinguishable, from the platform's perspective, from a genuine second, independent request.

---

# 9. Request Correlation

**Identifier: API:CORRELATION**

Every API request carries a correlation identifier that ties together everything that happens as a consequence of it — the request itself, any domain events it causes to be published (`ARCH:CROSS_DOMAIN_COMMUNICATION`), and any error recorded because of it. Its purpose is to make a single business action traceable across module boundaries and across the eventual-consistency lag `DATA:CONSISTENCY_RULES` permits, so that a failure investigation follows one thread of cause and effect rather than requiring disconnected records to be reassembled after the fact.

This directly supports `PRINCIPLES:EXPLICIT_FAILURE` and `ARCH:NFR`'s observability principle: an operator or caller investigating what happened must be able to follow it, not reconstruct it. This section establishes the purpose and requirement only — the specific mechanism by which a correlation identifier is carried and propagated is an implementation concern, not decided here.

---

# 10. Error Model

**Identifier: API:ERROR_MODEL**

Every module's API returns errors in one consistent, platform-wide structure — a caller must be able to handle errors from any module the same way, per `PRINCIPLES:CONSISTENCY_OVER_NOVELTY`. An error response states what went wrong in terms the caller can act on: a validation failure identifies which input was invalid and why; a conflict (per `DATA:VERSIONING`) identifies that a conflict occurred, not just that the write failed; a permission denial states that access was denied, not why in a way that would leak information the caller isn't entitled to.

No error is ever swallowed, downgraded to a generic failure, or represented as a successful response with an error buried in its body — per `PRINCIPLES:EXPLICIT_FAILURE`, the HTTP-level signal and the structured error body must agree with each other.

---

# 11. Response Envelope Standards

**Identifier: API:RESPONSE_ENVELOPE**

Every successful response and every error response follows one consistent structural shape platform-wide: a clear separation between the substantive result of the request, metadata about the response itself (such as pagination information, per `API:PAGINATION`), and — for errors — the structured error detail described in `API:ERROR_MODEL`. This document does not prescribe the literal representation format; it prescribes that whatever format is used, it is used the same way by every module, so a caller never needs module-specific parsing logic.

---

# 12. Pagination

**Identifier: API:PAGINATION**

Any operation that can return more than one resource is paginated by default — an unbounded result set is never returned, regardless of how small a module's data happens to be today, since `ARCH:NFR`'s scalability principle must hold as data grows. Pagination works the same way across every module's API — a caller learns it once. Pagination metadata is carried in the response envelope (`API:RESPONSE_ENVELOPE`), not mixed into the substantive result.

---

# 13. Filtering

**Identifier: API:FILTERING**

A caller may filter a list of resources only on fields the owning module has explicitly published as filterable through its contract (`MODULE:PUBLIC_CONTRACT`) — filtering is never opened up to arbitrary internal fields, since that would let a caller depend on internal storage shape rather than the published contract, in direct violation of `API:PHILOSOPHY`.

---

# 14. Sorting

**Identifier: API:SORTING**

The same rule that governs filtering (`API:FILTERING`) governs sorting: a caller may sort only on fields a module has explicitly published as sortable. A sortable field being convenient to sort on internally is not sufficient justification for exposing it — it must be something the module has deliberately decided belongs in its public contract.

---

# 15. Field Selection and Expansion Strategy

**Identifier: API:FIELD_SELECTION**

A caller may request a subset of a resource's published fields, or request expansion of a related resource, but expansion must never be used to reach across a module boundary in a way `MODULE:INTERACTION_RULES` would not otherwise permit. Expanding a reference to an entity owned by a different module returns only what that owning module has published about it — identity and whatever summary fields it has chosen to expose — never a bypass into that module's own data as if the requesting module's API had authority over it.

---

# 16. Batch Operations

**Identifier: API:BATCH_OPERATIONS**

A batch request is a set of independent, single-aggregate operations (`API:HTTP_METHODS`, `DATA:TRANSACTION_BOUNDARIES`) submitted together for convenience — it is never treated as one large multi-aggregate transaction. Each operation within a batch succeeds or fails independently, and the response reports the outcome of each individually; a batch is never all-or-nothing in a way that would hide which specific operations actually succeeded, per `PRINCIPLES:EXPLICIT_FAILURE`.

---

# 17. Long-Running Operations

**Identifier: API:LONG_RUNNING_OPERATIONS**

An operation that cannot complete within a normal request/response cycle must expose an explicit way for the caller to check its status — an API request is never left open indefinitely waiting for an outcome, and a caller is never left to guess whether an operation is still in progress, has failed, or has succeeded. This applies in particular to operations whose completion depends on eventual consistency across modules (`ARCH:CROSS_DOMAIN_COMMUNICATION`, `DATA:CONSISTENCY_RULES`) — the API must not disguise that lag as if it were synchronous.

---

# 18. Authentication Integration Points

**Identifier: API:AUTHENTICATION**

Every API request is authenticated through `MODULE:IDENTITY_ACCESS` — no module implements its own, independent authentication mechanism. This is a direct consequence of Identity & Access being Platform-domain and depended upon by every other module (`ARCH:DOMAIN_MAP`, `MODULE:PLATFORM`), and of `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`: there is exactly one place in the platform that knows who a caller is.

---

# 19. Authorization Expectations

**Identifier: API:AUTHORIZATION**

Every API operation is checked against the caller's permissions before it executes, consistently at the API boundary — a module's API never trusts that authorization was already handled somewhere upstream, and never performs its own bespoke, module-specific permission logic disconnected from the platform's shared permission model owned by `MODULE:IDENTITY_ACCESS`. This section states the expectation only; the concrete permission model itself is the subject of `08_SECURITY_STANDARD.md`.

---

# 20. Rate Limiting

**Identifier: API:RATE_LIMITING**

The platform must protect itself and every module from being overwhelmed by excessive request volume, whether malicious or accidental — one caller's excessive usage must never degrade the platform for any other caller, consistent with `ARCH:NFR`'s fault-tolerance principle. Rate limiting is enforced consistently at the API boundary platform-wide, not as a bespoke concern each module handles differently, per `PRINCIPLES:CONSISTENCY_OVER_NOVELTY`. A caller who is rate-limited is always told so explicitly — never given an ambiguous failure that could be mistaken for a different problem, per `PRINCIPLES:EXPLICIT_FAILURE`.

This section establishes the architectural philosophy only. It does not decide specific limits, algorithms, or enforcement mechanisms — those are implementation and engineering concerns for a future document.

---

# 21. Event Publication Principles

**Identifier: API:EVENT_PUBLICATION**

An API operation that mutates an aggregate causes the owning module to publish the same domain events (`ARCH:CROSS_DOMAIN_COMMUNICATION`) it would publish if that mutation had occurred through any other trigger. The API is not a side channel that lets a change occur without the rest of the platform learning about it — an event fired only for API-triggered changes, and not for the same change triggered another way, would violate `DATA:CONSISTENCY_RULES` and `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` by making the platform's behavior depend on how a change happened to occur rather than what changed.

---

# 22. Backward Compatibility Rules

**Identifier: API:BACKWARD_COMPATIBILITY**

Compatibility expectations follow `MODULE:STABILITY` directly: a breaking change to a Core or Stable module's API requires a new version (`API:VERSIONING`) and the elevated justification `MODULE:STABILITY` already requires for a breaking change to that module's public contract. An Evolvable or Experimental module's API may change more freely, consistent with the lighter review those classifications already carry. This document does not introduce a separate compatibility policy — it applies the one `04_MODULE_ARCHITECTURE` already established, at the API layer specifically.

---

# 23. Deprecation Policy

**Identifier: API:DEPRECATION**

Deprecating an API version, field, or capability is itself a change that must be visible, not silent — per `PRINCIPLES:EXPLICIT_FAILURE` and `PRINCIPLES:PREDICTABLE_UPGRADES`, a caller must be able to learn that something they depend on is deprecated before it is removed, with a defined minimum notice window between deprecation and removal. This document does not fix that window's length — that is a policy decision appropriately made when the platform has real API consumers to calibrate it against — but it does establish that silent removal without a preceding deprecation notice is never acceptable, regardless of what that window eventually is.

---

# 24. Documentation Requirements

**Identifier: API:DOCUMENTATION**

Every capability an API exposes must have a corresponding OpenAPI schema entry, per `ARCH:TECHNOLOGY_DECISIONS` §9.1. An API capability with no OpenAPI entry does not exist as far as any consumer or reviewer is concerned — this is the API-layer application of `GOVERNANCE:SELF_CONTAINED_DOCUMENTATION`: a future contributor or integrator must be able to understand and use an API from its documentation alone, without needing institutional knowledge of how it came to be built.

---

# 25. API Stability Levels

**Identifier: API:STABILITY_LEVELS**

An API's stability level generally matches the stability classification (`MODULE:STABILITY`) of the module exposing it — Core and Stable modules expose Core and Stable APIs; Evolvable and Experimental modules expose Evolvable and Experimental APIs. A module may explicitly expose a portion of its API at a lower stability level than its own classification (for example, a Stable module introducing a genuinely new capability as an Experimental API surface before committing to it), but this must be stated explicitly wherever it applies — a caller must never have to guess an API's actual stability level from context.

---

# 26. Review Checklist

**Identifier: API:REVIEW_CHECKLIST**

Before any API capability is considered ready for implementation, it must satisfy:

- [ ] The resource it exposes corresponds to a real aggregate or an explicitly published read model (`API:RESOURCE_NAMING`).
- [ ] Every field exposed for filtering, sorting, or expansion has been deliberately published as part of the module's contract, not exposed by internal convenience (`API:FILTERING`, `API:SORTING`, `API:FIELD_SELECTION`).
- [ ] Every write respects `DATA:TRANSACTION_BOUNDARIES` — no operation requires more than one aggregate to change atomically (`API:HTTP_METHODS`, `API:BATCH_OPERATIONS`).
- [ ] Error responses use the platform-wide error model (`API:ERROR_MODEL`) and response envelope (`API:RESPONSE_ENVELOPE`).
- [ ] List operations are paginated (`API:PAGINATION`).
- [ ] The operation's authentication and authorization path goes through `MODULE:IDENTITY_ACCESS` (`API:AUTHENTICATION`, `API:AUTHORIZATION`).
- [ ] The capability is subject to platform-wide rate limiting, with no bespoke module-specific enforcement (`API:RATE_LIMITING`).
- [ ] The request carries a correlation identifier propagated to any events or errors it causes (`API:CORRELATION`).
- [ ] Any state change results in the module's normal domain event publication (`API:EVENT_PUBLICATION`).
- [ ] The capability has a complete OpenAPI schema entry before being considered done (`API:DOCUMENTATION`).
- [ ] The capability's stability level is explicit and consistent with its owning module's classification, or explicitly stated otherwise (`API:STABILITY_LEVELS`).

---

# 27. Acceptance Criteria

**Identifier: API:ACCEPTANCE_CRITERIA**

This document is ready for Accepted status only when:

1. It has been reviewed for internal consistency and consistency with `00`–`05`.
2. Every rule in this document has been checked against `MODULE:PUBLIC_CONTRACT`, `MODULE:STABILITY`, and `DATA:*` for conflicts, with none found.
3. No concrete endpoint, controller, DTO, framework-specific code, or database query appears anywhere in the document.
4. The Product Owner has confirmed this document does not constrain the product beyond what `03_SYSTEM_ARCHITECTURE` and `04_MODULE_ARCHITECTURE` already do.

Individual API capabilities built later are considered acceptable only when they satisfy the Review Checklist in `API:REVIEW_CHECKLIST` in full.

---

End of Document
