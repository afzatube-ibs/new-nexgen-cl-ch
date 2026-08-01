# neXgen Core
## 02_PRODUCT_PRINCIPLES

| Field | Value |
|---|---|
| **Title** | Product Principles |
| **Document ID** | PRINCIPLES |
| **Version** | 0.1 (Draft) |
| **Status** | Draft |
| **Author** | Chief Software Architect & Lead Engineer (drafted at Product Owner's direction; ordinarily owned by Product & Solution Architect — pending independent review, consistent with the process followed for `01_PRODUCT_VISION`) |
| **Last Updated** | 2026-08-01 |
| **Parent Document** | 01_PRODUCT_VISION |
| **Related Documents** | 00_PROJECT_GOVERNANCE |
| **Applies To** | Every feature, module, API, and architectural decision made in neXgen Core |

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.1 | 2026-08-01 | Initial draft | First Product Principles draft, derived from `01_PRODUCT_VISION` |

---

# 1. Purpose

**Identifier: PRINCIPLES:PURPOSE**

`01_PRODUCT_VISION` establishes why neXgen Core exists. This document translates that vision into principles specific enough to test a proposal against. Where the Vision states belief, this document states rule.

Every principle below must satisfy two conditions to belong in this document:

1. **Testable** — a reviewer can look at a specific proposal and determine whether it complies, without relying on subjective taste.
2. **Enforceable** — non-compliance is a legitimate reason to reject a proposal at review, not merely a suggestion for improvement.

A statement that cannot be tested or enforced belongs in `01_PRODUCT_VISION` as an aspiration, not in this document as a principle.

---

# 2. Merchant-First

**Identifier: PRINCIPLES:MERCHANT_FIRST**

**Principle:** When a decision benefits the platform's operators (internal efficiency, development speed, architectural elegance) at the expense of the merchant's ability to run their business, the merchant's need takes priority.

**Decision rule:** For any proposal, ask: does this make the merchant's operational reality harder, slower, or less clear in order to make something else easier? If yes, the proposal must either be redesigned or explicitly justified as a documented trade-off with the merchant's cost stated plainly.

**Example — compliant:** A feature ships more slowly because it requires an additional confirmation step for an operation that would otherwise silently overwrite existing inventory data.

**Example — non-compliant:** A feature ships faster by removing an existing safeguard that merchants relied on, without replacing it with an equivalent protection.

---

# 3. Operational Clarity Over Feature Volume

**Identifier: PRINCIPLES:OPERATIONAL_CLARITY**

**Principle:** A smaller set of features the merchant fully understands and trusts is preferred over a larger set of features that create ambiguity about what the system will actually do.

**Decision rule:** A proposed feature must be rejected or redesigned if a merchant using it correctly, in good faith, could still be surprised by its outcome. "The documentation explains it" is not sufficient — the behavior itself must be predictable from the interface.

**Example — compliant:** A discount rule that cannot be combined with another discount rule is visibly disabled when a conflicting rule is already active, rather than silently applying only one of them.

**Example — non-compliant:** Two settings that interact in a non-obvious way, where enabling one silently changes what the other does, discoverable only by reading external documentation.

---

# 4. Configuration Over Customization

**Identifier: PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION**

**Principle:** Business behavior should be adjustable through defined configuration wherever realistically possible. Custom, one-off logic that only one merchant uses is a last resort, not a first option.

**Decision rule:** Before a proposal introduces a new customization mechanism (a hook, an override, a merchant-specific code path), it must first demonstrate that the same outcome cannot be achieved through existing or newly-proposed configuration. If it can be achieved through configuration, the customization mechanism is rejected.

**Example — compliant:** A merchant sets a minimum order value for free shipping through a settings field.

**Example — non-compliant:** A merchant's minimum-order-for-free-shipping requirement is implemented as a one-off conditional in the checkout logic that only applies to that merchant's store.

**Relationship to other principles:** This principle exists in tension with `PRINCIPLES:MERCHANT_FIRST` when a merchant has a genuine need that no reasonable configuration can satisfy. In that case, the correct response is to propose a new configuration option that generalizes the need — not to bypass configuration entirely. See `VISION:NON_GOALS` regarding unrestricted core modification.

---

# 5. Consistency Over Novelty

**Identifier: PRINCIPLES:CONSISTENCY_OVER_NOVELTY**

**Principle:** A pattern already established elsewhere in the platform (a naming convention, an interaction pattern, a data shape) must be reused rather than reinvented, unless the existing pattern is demonstrably unfit for the new case.

**Decision rule:** A proposal introducing a new pattern where an existing, applicable pattern already exists must state explicitly why the existing pattern doesn't work. "The new approach is better" is not sufficient justification on its own — it must be better enough to justify the inconsistency it introduces across the platform.

**Example — compliant:** A new module reuses the platform's existing pagination, filtering, and bulk-action patterns rather than introducing its own.

**Example — non-compliant:** A new module introduces its own distinct approach to search and filtering because it "felt more natural" for that module's data, with no other module ever reusing it.

---

# 6. Security Is Not Optional

**Identifier: PRINCIPLES:SECURITY_FIRST**

**Principle:** A feature that is insecure is not a feature with a known limitation — it is an incomplete feature. Security requirements are not negotiable in exchange for schedule, convenience, or scope.

**Decision rule:** A proposal cannot be marked complete, reviewed as done, or accepted for release if it has a known, unaddressed security gap, regardless of how minor the gap appears or how unlikely exploitation seems. This is a hard gate: "we'll fix it later" is not an acceptable resolution for a known gap at release time.

**Example — compliant:** A file-upload feature is delayed until upload validation, size limits, and storage isolation are implemented, even though the core upload mechanism itself works.

**Example — non-compliant:** A feature ships with a known permission-check gap because the gap is "unlikely to be hit in practice."

---

# 7. Auditability By Default

**Identifier: PRINCIPLES:AUDITABILITY**

**Principle:** Any action that changes business-critical data (orders, inventory, pricing, permissions, financial records) or that reflects a decision an administrator made (an approval, an override, a rejection) must leave a record of who did it, what changed, and when.

**Decision rule:** A proposal touching business-critical data must specify what audit record it produces. If it cannot specify one, it is incomplete, regardless of whether the underlying functionality works correctly.

**Example — compliant:** A price override at checkout is recorded with the administrator's identity, the original price, the overridden price, and a timestamp.

**Example — non-compliant:** A price override at checkout succeeds and updates the order total, with no record of who authorized it or what the original value was.

---

# 8. Every Operational Rule Has One Home

**Identifier: PRINCIPLES:SINGLE_SOURCE_OF_TRUTH**

**Principle:** A given business rule (a pricing calculation, a stock threshold, a permission check) is implemented in exactly one place. Every other part of the system that needs that rule's outcome asks the owning module for it — it does not reimplement the rule locally.

**Decision rule:** A proposal that reimplements logic that already exists elsewhere in the platform must be rejected unless it can demonstrate that no dependency on the existing implementation is feasible, and even then, the duplication must be explicitly documented with the reason it was unavoidable.

**Example — compliant:** A reporting module calls the Inventory module to determine current stock levels rather than querying inventory tables directly.

**Example — non-compliant:** A reporting module and a storefront module each independently calculate "in stock" status using slightly different logic, producing different answers for the same product.

---

# 9. Predictable Upgrades

**Identifier: PRINCIPLES:PREDICTABLE_UPGRADES**

**Principle:** Applying a platform update must not require a merchant to re-learn workflows, lose configuration, or discover that previously working behavior has silently changed.

**Decision rule:** A proposal that changes existing, documented behavior must state what happens to a merchant currently relying on the old behavior. "The new behavior is better" does not by itself satisfy this requirement — the proposal must address migration, backward compatibility, or an explicit, visible transition path.

**Example — compliant:** A change to how discounts stack is introduced as a new, opt-in setting, with the previous behavior remaining the default until the merchant explicitly switches.

**Example — non-compliant:** A change to how discounts stack is deployed as the new default behavior for all merchants with no notice and no way to preserve the previous behavior.

---

# 10. Accessible By the People Who Run the Business

**Identifier: PRINCIPLES:OPERATIONAL_ACCESSIBILITY**

**Principle:** Common operational tasks (adjusting pricing, managing inventory, configuring fulfillment rules, managing staff permissions) must be achievable by the people running the business through the platform's own interface, without requiring direct database access, custom code, or developer involvement.

**Decision rule:** A proposal for a common operational capability that can only be exercised through direct technical intervention (a database query, a manual code deployment, a support ticket to engineering) is incomplete. It must be paired with an interface-accessible path before it can be considered done.

**Example — compliant:** A new fulfillment rule type is added with a corresponding settings screen where an operator can configure it.

**Example — non-compliant:** A new fulfillment rule type is added, but activating it for a specific merchant requires a database update performed by an engineer.

---

# 11. Explicit Failure Over Silent Failure

**Identifier: PRINCIPLES:EXPLICIT_FAILURE**

**Principle:** When an operation cannot complete as expected, the person who initiated it must be told, in terms they can act on. A failure that is only visible in a log file, and not to the person affected by it, is not handled — it is hidden.

**Decision rule:** A proposal must specify, for every operation that can fail, what the initiating user sees when it does. "Logged for engineering to review later" does not satisfy this requirement on its own for any failure that affects the user's own action or data.

**Example — compliant:** A save operation that fails due to a network issue shows the merchant a clear error and confirms the previous data was not lost.

**Example — non-compliant:** A save operation that fails writes a warning to a server log while the interface shows no error, leading the merchant to believe the change was saved.

---

# 12. Relationship to Other Documents

**Identifier: PRINCIPLES:AUTHORITY**

This document is subordinate to `00_PROJECT_GOVERNANCE` and `01_PRODUCT_VISION`. Every principle above must be traceable to something already established in the Vision — this document does not introduce new product direction, only operationalizes what the Vision already states.

Every document from `03_SYSTEM_ARCHITECTURE` onward must be consistent with the principles defined here. If a lower-level document is found to require violating one of these principles, the lower-level document is revised — this document is not silently reinterpreted to accommodate it, per `GOVERNANCE:CHANGE_MANAGEMENT`.

---

End of Document
