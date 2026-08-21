# neXgen Core — Marketplace Platform Architecture (Theme Marketplace + App Marketplace)

| Field | Value |
|---|---|
| **Status** | **Draft — Proposed, pending Product Owner review** |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-17 |
| **Phase** | 3.3, Phase C — architecture and research only |
| **Builds on** | `THEME_ENGINE_ARCHITECTURE.md` §4 (sandboxing), §9 (child themes/inheritance), §10 (future marketplace support — this document is that section's own promised follow-up); `04_MODULE_ARCHITECTURE.md` §12 `MODULE:EXTENSIBILITY_MECHANISM` (real, Accepted, the backend's own already-designed extension registration/lifecycle/surface — this document is the concrete Marketplace realization of it, not a parallel mechanism); `CDP_ARCHITECTURE.md` §5 (Destination contract pattern, reused here) |

---

## 1. One Governing Principle: Two Marketplaces, One Extension Mechanism

Every "app" or "theme" a third party ever publishes to this platform is, underneath, one of a small number of already-real, already-proven extension seams:

- A **Theme Package** implementing `ThemePackage` (`THEME_ENGINE_ARCHITECTURE.md` §2.3) — presentation only.
- A **contract implementation** — a new `PaymentGatewayContract` (Payments), `SearchEngineContract` (Search), or `DestinationContract` (`CDP_ARCHITECTURE.md` §5.1) — a genuinely new capability behind an existing, proven pluggable-architecture seam.
- An **event-subscription extension** — a pure reactor (send a Slack message on `OrderPlaced`, sync a customer to an external CRM on `CustomerRegistered`) using `MODULE:EXTENSIBILITY_MECHANISM`'s own already-Accepted registration/lifecycle/surface exactly as `04_MODULE_ARCHITECTURE.md` §12 already defines it — read-only event access, a declared configuration surface, nothing else.

The Marketplace Platform's entire job is **packaging, distribution, review, and lifecycle management** around these three already-real seams — it introduces **no new runtime extensibility mechanism**. This is the single most important architectural decision in this document: a Marketplace built by inventing a fourth, marketplace-specific extension model would fragment exactly what `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` and `MODULE:EXTENSIBILITY_MECHANISM`'s own existing design already unify.

---

## PART I — THEME MARKETPLACE

### 2. Packaging

A theme is published as one signed archive containing the compiled `ThemePackage` implementation plus a manifest:

```json
{
  "id": "nexgen-default",
  "name": "neXgen Default",
  "version": "1.4.0",
  "author": "neXgen",
  "license": "commercial | MIT | ...",
  "extends": null,
  "compatibility": { "themeEngineContract": "^1.0.0" },
  "screenshots": ["media-asset-id-1", "media-asset-id-2"]
}
```

`compatibility.themeEngineContract` requires the `ThemePackage` interface itself (`THEME_ENGINE_ARCHITECTURE.md` §2.3) to carry its own semantic version — a genuinely new requirement this document adds: without it, there is no mechanical way to know whether a theme built against an older Core will still resolve correctly against a newer one. This is a small, real, additive change to that already-Accepted document's own contract, flagged here rather than silently assumed.

### 3. Signing & Sandbox — Two Independent Layers of Defense

- **Signing** (install-time): every published archive is signed by the Marketplace's own publishing pipeline after certification (§6) passes; the Storefront's install/update path verifies the signature before ever loading a theme's code, rejecting anything unsigned or tampered with — provenance and integrity, checked once, at the boundary.
- **Sandbox** (runtime, already Accepted): `THEME_ENGINE_ARCHITECTURE.md` §4's existing rules — no cross-theme imports, no direct backend calls, additive-only token overrides — enforced continuously, every render, regardless of whether the signature check already passed. This is `SECURITY:DEFENSE_IN_DEPTH` applied directly: a compromised signing key is a real, if unlikely, risk, and the sandbox holds even if that outer layer is somehow defeated.

### 4. Versioning, Compatibility, Dependencies, Updates, Rollback

- **Versioning**: semver, independent of the platform's own release version — a theme's `1.4.0` means nothing about neXgen Core's own version number.
- **Dependencies**: the *only* real inter-theme dependency is `extends` (`THEME_ENGINE_ARCHITECTURE.md` §9, already Accepted) — a child theme's manifest names its parent's `id` and a compatible version range; the Marketplace install pipeline resolves this chain and rejects an install whose parent isn't itself available and compatible, per §9's own "acyclic, resolved once, fails fast" rule.
- **Updates**: staged — a new version installs alongside the currently-active one, is verified (signature + a smoke-render against the store's own real content, catching a broken update before a merchant's storefront goes down because of it), then swaps atomically. This mirrors `DEPLOYMENT:CANARY_AND_STAGED_RELEASES`'s already-Accepted platform-wide principle, applied at theme-install granularity.
- **Rollback**: reactivating the immediately-prior signed package — never a destructive overwrite, and, per `DEPLOYMENT:ROLLBACK_PHILOSOPHY`'s already-Accepted "verified before relied upon" rule, a theme's own rollback path is exercised as part of certification (§6), not assumed to work.

### 5. Child Themes (already designed)

No new content — `THEME_ENGINE_ARCHITECTURE.md` §9 already specifies this in full. Named here only to confirm the Marketplace's own packaging/versioning machinery (§§2–4) applies identically to a child theme as to a root one; a child theme is not a structurally different Marketplace artifact.

### 6. Theme Certification

A defined review gate before signing (§3) — checkable in two tiers:

1. **Mechanical (automated)**: the same ESLint boundary-rule mechanism `ADR-0009` already uses to make a cross-`apps/*` import a build-time failure, extended to a Theme-Package-specific ruleset — no direct `fetch`/backend import, no cross-theme import, only additive token usage (§`THEME_ENGINE_ARCHITECTURE.md` §4). A failing mechanical check blocks publication outright, no human review required to catch it.
2. **Manual/editorial**: accessibility (`UI:ACCESSIBILITY`, already-Accepted baseline — a theme that fails keyboard operability or contrast is rejected regardless of visual polish), and, once real numeric budgets exist (`PERFORMANCE_FOUNDATION.md`'s own stated future step), a performance-budget check.

### 7. Licensing

Named, not designed — a `license` field (§2) and a future royalty/payout hook are the entire architectural surface this document commits to; the actual commercial mechanics (pricing, revenue share, payout processing) are a Payments-module-adjacent concern for a dedicated future phase, exactly as `THEME_ENGINE_ARCHITECTURE.md` §10 already stated when it first named this gap.

---

## PART II — APP MARKETPLACE (PLUGIN SDK)

### 8. Plugin Manifest

```json
{
  "id": "nexgen-slack-order-alerts",
  "name": "Slack Order Alerts",
  "version": "1.0.0",
  "kind": "event-subscriber | contract-implementation",
  "subscribesTo": ["OrderPlaced", "PaymentCaptured"],
  "cdpEvents": [],
  "providesContract": null,
  "configSchema": { "webhookUrl": "string" },
  "requiredModules": [],
  "permissions": { "reads": ["Orders.summary"], "writes": [] }
}
```

`kind` names which of §1's two real seams this plugin uses. `permissions.reads`/`.writes` is the **explicit, reviewable least-privilege declaration** — an admin installing this plugin sees exactly what it will read and do, the same well-understood, borrowed-not-invented pattern a mobile app permission screen already uses, before activation ever occurs — directly serving `SECURITY:PHILOSOPHY`'s least-privilege principle at the marketplace layer specifically.

### 9. Lifecycle & Hooks

Unchanged from, and a direct citation of, `MODULE:EXTENSIBILITY_MECHANISM` (`04_MODULE_ARCHITECTURE.md` §12, already Accepted): **registered → active → inactive**. Only an active plugin receives events or has its configuration surface exposed; deactivation must never corrupt core data, per that section's own already-stated rule — this document adds no new lifecycle state, only the Marketplace packaging around triggering those transitions from an admin-facing install/uninstall flow.

### 10. Events & Webhooks

A plugin's `subscribesTo` (real backend `DomainEvent`s) and `cdpEvents` (`CDP_ARCHITECTURE.md` §4.1 `CdpEvent`s, via that document's own §5.2 Custom Webhook destination — a Marketplace "app" that wants behavioral data is, architecturally, just a `DestinationContract` implementation, or a Custom Webhook consumer if it doesn't warrant a first-class contract) are both delivered through the **same generic outbound-webhook mechanism** `IMPLEMENTATION_MASTER_PLAN.md` §34 already names ("Webhooks & Integrations," Phase 2, not yet built) — this document confirms that module, once built, *is* the delivery mechanism for both Marketplace plugin events and general third-party webhooks; it is not a separate thing this document invents.

### 11. Capability Discovery & Dependency Resolution

The Marketplace's own listing/install UI resolves a plugin's `kind`/`providesContract` to a real, named extension point (a new `PaymentGatewayContract`, a new `SearchEngineContract`, a new `DestinationContract`, or a pure event-subscriber) — an admin browsing the marketplace sees "this app adds a payment method" or "this app reacts to your orders," never an undifferentiated list. `requiredModules` (e.g. a plugin needing `MODULE:CDP` to exist) is checked at install time, and an incompatible install is rejected with a specific, actionable reason (`PRINCIPLES:EXPLICIT_FAILURE`), never silently allowed to fail at first use.

### 12. Updates, Rollback, Certification

Identical discipline to §§4/6 (Theme Marketplace) — staged install, signed packages, verified rollback. Certification depth scales with `kind`: an event-subscriber plugin's review is primarily a permissions/security audit (does its declared `permissions` match its actual behavior, is its config schema free of injection risk); a contract-implementation plugin (a new payment gateway) requires the same functional-correctness bar this platform's own real gateways (SSLCommerz/bKash/Nagad) were already held to during their own build.

### 13. Future Billing

Named, not designed — identical posture to §7's Theme licensing: a real, deferred, Payments-module-adjacent future capability.

---

## PART III — DEVELOPER EXPERIENCE

### 14. Developer Portal

A future, externally-facing (not admin-internal) surface: account/organization registration, manifest submission, review-status tracking, and a public compatibility matrix (which `themeEngineContract`/plugin-API versions a given submission targets) — named as required, not designed screen-by-screen here, consistent with this entire research initiative's own "architecture, not UI" scope discipline.

### 15. CLI

`nexgen theme create <name>`, `nexgen theme dev` (a local dev server rendering a theme-in-progress against either a mock content fixture set or a real, developer-owned store), `nexgen theme publish` (build, sign-request, submit for certification); the identical three-verb shape for `nexgen plugin *`. This mirrors the Shopify CLI / VSCode `vsce` precedent the master task itself named — a proven, low-risk shape to adopt, not reinvent.

### 16. Testing

The SDK ships a test harness: fixture `CdpEvent`/`DomainEvent` factories, a mock `ThemePackage`-resolution context, and a mock plugin-permission grant — so a third-party developer can genuinely unit-test their own theme/plugin without a live backend, extending `TESTING:TEST_ISOLATION`'s already-Accepted platform-wide discipline to developers this platform doesn't directly employ.

### 17. Documentation

Generated, not hand-written, from the same TypeScript/Zod contracts already authoritative elsewhere (`ThemePackage`, `DestinationContract`, the plugin manifest schema, §8) — the third-party-developer-facing application of `GOVERNANCE:SELF_CONTAINED_DOCUMENTATION`'s already-Accepted platform-wide rule.

---

## PART IV — GOVERNANCE

### 18. Marketplace Governance

- **Review authority**: a defined certification team/process (§6, §12) — this document does not name who, only that the gate exists and is mandatory before signing.
- **Compatibility matrix**: public, per §14 — a merchant or developer can always answer "will this theme/plugin work on my current version" without guessing.
- **Deprecation**: a contract version (`ThemePackage`, `DestinationContract`, the plugin manifest schema itself) being retired follows `API:DEPRECATION`'s already-Accepted platform-wide minimum-notice-before-removal principle, applied to marketplace contracts specifically — never a silent breaking change to every published theme/plugin at once.
- **Takedown/suspension**: a plugin or theme found violating its own declared permissions (§8) or otherwise compromised is deactivatable **platform-wide**, immediately, without requiring the rest of the platform to stop — the direct, marketplace-scale application of `SECURITY:INCIDENT_RESPONSE`'s already-Accepted "containment before recovery" principle and `MODULE:EXTENSIBILITY_MECHANISM`'s own "deactivating an extension must not corrupt core data" guarantee, both already real architectural commitments this document only extends to a third-party-published context.

---

## 19. What This Document Deliberately Does Not Do

- Does not implement anything — architecture only, per this phase's own governing instruction.
- Does not design the Developer Portal's or CLI's own concrete UI/command surface beyond the verb-level sketch in §§14–15.
- Does not design billing/payout mechanics (§§7, 13) — named as required future work, deferred to a Payments-adjacent phase.
- Does not invent a new extensibility runtime — §1's entire premise is that none is needed.

---

End of Document
