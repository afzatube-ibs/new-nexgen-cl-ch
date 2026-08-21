# neXgen Core — Customer Experience Architecture

| Field | Value |
|---|---|
| **Status** | **Accepted** (retroactively ratified 2026-08-19 — this document was treated as the real Storefront standard throughout Beta Milestones 1–2.6 despite never being formally accepted; see `planning/reviews/EVIDENCE_BASED_PLATFORM_AUDIT.md` §1.3) |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-17 (ratified 2026-08-19) |
| **Builds on** | `STORE_FRONTEND_ARCHITECTURE.md` (routing, rendering, API layer), `STOREFRONT_COMPONENT_ENGINE.md` (primitives), `SEARCH_ARCHITECTURE.md`, `docs/07_UI_DESIGN_SYSTEM.md`, `docs/frontend/DESIGN_SYSTEM.md` |
| **Folds in** | The master task's "Enterprise UX" and "Performance" scope areas — Performance is already fully specified in `PERFORMANCE_FOUNDATION.md` and `STORE_FRONTEND_ARCHITECTURE.md` §§2/4/8 (nothing new to add without a real build to measure against, per that document's own stated limit); Enterprise UX is §1 below, folded in rather than split into a separate document since it is one coherent design philosophy applied consistently across every surface named §§2–14 cover, not a distinct architecture layer |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-19 | Status changed from Draft to Accepted. No technical content changed. | Repository Stabilization (Phase 1): this document had been treated as the de facto Storefront standard across Beta Milestones 1–2.6 without ever being formally ratified — `EVIDENCE_BASED_PLATFORM_AUDIT.md` §1.3 surfaced the inconsistency; Product Owner approved resolving it by acceptance rather than supersession, since the guidance was already the real, working standard. |

---

## 1. Enterprise UX Standard

### 1.1 What "enterprise-grade, never generic Tailwind" actually means

`07_UI_DESIGN_SYSTEM.md` §`UI:DESIGN_PHILOSOPHY` already states the requirement ("enterprise-grade, never generic... without feeling cold, templated, or interchangeable") — this section makes it concrete by naming what the reference products actually do differently from a default-Tailwind storefront:

- **Stripe / Linear**: restraint over decoration. Almost no gratuitous shadow, gradient, or illustration; hierarchy is carried entirely by type scale, spacing, and a disciplined, narrow color palette (`DESIGN_SYSTEM.md` §1.1's own semantic-role system, not a wide decorative one). neXgen's storefront defaults (`STOREFRONT_COMPONENT_ENGINE.md` §3) inherit this discipline directly — the *default* primitive implementations must read as deliberately plain, not as an unfinished placeholder, exactly as that document's own §3 already states.
- **Apple / Shopify Storefront**: product photography and whitespace do the persuading, not copy density. A Product Detail page (§6) budgets generous negative space around imagery before adding a fourth trust badge or a fifth cross-sell block — every additional element on a page must justify its cost against `UI:VISUAL_HIERARCHY`'s "one primary emphasis" rule, never added by default.
- **Notion / Shopify Admin**: information density that scales with expertise, never overwhelming a first-time visitor and never under-serving a returning one. This is `UI:DENSITY`'s Comfortable/Compact/Dense model (already Accepted, admin-proven) applied to the Account area specifically (§9) — a customer's Order History list is Comfortable by default, never Dense, since a customer is not a daily power user the way a Catalog operator is.
- **Microsoft (Fluent) / PC Manager**: motion as confirmation, never spectacle — matches `UI:MOTION_ANIMATION`'s existing "purposeful, never decorative" rule exactly; nothing new to add here beyond confirming the storefront holds itself to the same bar the admin interface already does.

### 1.2 The concrete, checkable bar

Every customer-facing surface in §§2–14 must satisfy, in addition to `UI:REVIEW_CHECKLIST` (already binding, unchanged):

1. Exactly one primary call-to-action visible per viewport on first paint — never two competing "Add to Cart"-weight buttons on screen at once.
2. No default primitive implementation (`STOREFRONT_COMPONENT_ENGINE.md` §3) ships with a stock illustration, a generic hero gradient, or placeholder Latin text — every default is genuinely plain (`DESIGN_SYSTEM.md` tokens, unstyled beyond that) rather than fake-designed, so a merchant who never installs a Theme Package still gets something honest, not something that looks like an unfinished demo.
3. Every loading state (`UI:LOADING_STATES`) is a `Skeleton` shaped to match the real content's layout, never a generic spinner over a blank page — already Accepted platform-wide, restated here because a storefront's own first-paint experience is where this matters most competitively.

---

## 2. Homepage

A CMS Page at the catch-all root route (`STORE_FRONTEND_ARCHITECTURE.md` §1.1), composed from whatever Sections a merchant's Template (`THEME_ENGINE_ARCHITECTURE.md` §6, `homepage` archetype) starts from — `Hero`, `CategoryGrid`, `FlashSale`, `TrustBar`, `Testimonials` are the realistic default composition, all real, already-inventoried primitives (`STOREFRONT_COMPONENT_ENGINE.md` §2). No new capability required.

## 3. Category / Collection / Brand

Three listing archetypes (§`STORE_FRONTEND_ARCHITECTURE.md` §1.1), each composed from `CategoryGrid`/`ProductGrid` + `SEARCH_ARCHITECTURE.md` §3.3's facet/filter capability once built (Phase 1: `brand_id` filter only, real today). Pagination uses the real `Pagination` component (`DESIGN_SYSTEM.md` §2), server-driven per `API:PAGINATION`'s already-binding rule, never a client-side "load more" that silently degrades performance the way an unbounded client fetch would.

## 4. Search Results

Fully specified in `SEARCH_ARCHITECTURE.md` — this document adds no new capability, only confirms the route lives at `/search` (`STORE_FRONTEND_ARCHITECTURE.md` §1.1, SSR) and renders `ProductGrid` + facet sidebar + the empty-state pattern `UI:EMPTY_STATES` already requires ("guide a customer toward another path forward, not end their visit" — a genuinely populated "related categories" or "popular searches," per `SEARCH_ARCHITECTURE.md` §3.5, not a bare "no results" message).

## 5. Product Detail

`Hero`-equivalent product gallery + `ProductCard`'s own expanded fields + `StickyBuyBar` (mobile, per `STOREFRONT_COMPONENT_ENGINE.md` §2's own client-side, scroll-position-aware primitive) + `UpsellBlock`/`CrossSellBlock`/`RecommendedProducts`. Real backend data: Catalog's full Product record (already the largest, most mature backend surface in this platform) plus, once built, real-time Inventory availability (`MODULE:INVENTORY`, already real) and Pricing/Promotions-evaluated price (`EvaluatePromotionsAction`, already real, confirmed non-mutating and reusable exactly as `LANDING_ENGINE_ARCHITECTURE.md` §3.7 already proposes). **Reviews are not real** (§10) — a Product Detail page must render its own review section as an honest empty/not-yet-available state, never a fabricated rating, per `PRINCIPLES:EXPLICIT_FAILURE` applied to UX truthfulness.

## 6. Cart

`CartDrawer` (primary) + `/cart` full-page fallback (`STORE_FRONTEND_ARCHITECTURE.md` §1.1) — both driven by the same anonymous `localStorage` cart state until a real `CheckoutSession` is needed (§`STORE_FRONTEND_ARCHITECTURE.md` §3.3's own bridging design), never two divergent cart representations.

## 7. Checkout

Fully specified in `STORE_FRONTEND_ARCHITECTURE.md` §3 (rendering: SSR) and `LANDING_ENGINE_ARCHITECTURE.md` §3.2/§3.3 (Instant Checkout, order bumps). **Blocked on the real, named Category-B backend gap** (`STORE_FRONTEND_ARCHITECTURE.md` §3.3) for a genuinely authenticated customer flow; guest checkout (already a real, delivered backend capability — `MODULE:CHECKOUT`'s guest resolution, confirmed in this research pass) is usable today through the BFF once built, without waiting on the customer-auth-guard gap.

## 8. Account Shell

A permanent authenticated layout (mirroring `ADMIN_SHELL_ARCHITECTURE.md`'s own precedent, applied to a customer rather than a staff operator) hosting: Profile, Address Book, Order History, Notifications preferences. **Blocked on the same Category-B gap as Checkout** — an Account area has no meaning without a real customer identity to authenticate. Named here so the shell's own layout contract is settled now, even though it cannot render real data until that backend work lands.

## 9. Profile & Address Book

Real backend: `MODULE:CUSTOMERS` already owns exactly this data (`Customer` model, `CustomerAddress` — both confirmed real, already fully built and frozen for the *admin* side of this exact data in this engagement's own Phase 2.5 work). The customer-facing Account surface is, functionally, a scoped, self-service, customer-authenticated view over the same real Customers module — once Category B's guard exists, this is the *smallest* remaining gap of every Account sub-surface, since the backend data model and CRUD logic already exist and are already proven correct.

## 10. Wishlist & Reviews

Neither has a real backend today — both are named `Phase 2` in `IMPLEMENTATION_MASTER_PLAN.md` §§20–21, new modules, not yet formally added to `04_MODULE_ARCHITECTURE.md`. This document does not design their backend (out of scope, matching `CMS_ARCHITECTURE.md`'s own "propose the module, don't design what wasn't asked" discipline) — it only confirms their storefront surface would consume `WishlistItemAdded`-style events and a `List CRUD` contract exactly as the master plan already sketches, through the same BFF pattern every other customer-identified capability uses (§`STORE_FRONTEND_ARCHITECTURE.md` §3.3).

## 11. Returns

Real backend module (`MODULE:RETURNS`, Operations domain, Phase 1 basic scope per `04_MODULE_ARCHITECTURE.md` §6) — **this research pass did not independently re-confirm a customer-facing Return-request contract exists today** (this engagement's own prior admin-side work built Shipping/Fulfillment through Phase 2.8, and no equivalent Returns admin slice appears in this session's own task history); a future implementation phase must re-verify the real backend contract before building against it, per every other module's own established "research first" pattern in this engagement, rather than this document assuming a shape.

## 12. Notifications (Customer Preference Center)

Real backend: `MODULE:NOTIFICATIONS` (Phase 1, Email) already owns delivery — a customer-facing preference screen (opt in/out per notification category) is a thin, new, customer-authenticated CRUD surface over data this module could reasonably extend to own (a `notification_preferences` per-customer row), not designed in further detail here since it is a small, low-complexity addition once Category B exists.

## 13. Referral

No backend exists, not named as a Phase 1/2/3 module in `IMPLEMENTATION_MASTER_PLAN.md` at all — genuinely future, Growth-domain-adjacent (CRM/Marketing territory once those are built). Named here only as a placeholder the master task itself required; no architecture proposed.

## 14. Gift Cards (Future)

Not built, but explicitly **already an intended future extension point of the real, frozen Promotions backend** — confirmed directly from `Models\Promotion`'s own docblock: the discount-type enum and evaluation contract are "designed to extend to Loyalty, Gift Cards, and Vouchers without an aggregate redesign." This is a genuinely load-bearing finding for `NEXTGEN_FRONTEND_MASTER_PLAN.md`'s own future roadmap — Gift Cards is not a speculative bolt-on; it is a backend capability this platform's own engineers already designed room for.

---

## 15. What This Document Deliberately Does Not Do

- Does not design any specific page's pixel layout — per every other document in this set's own consistent scope discipline, this is composition-and-capability mapping, not visual design.
- Does not resolve the Returns backend contract question in §11 — flagged as requiring re-verification, not answered here.
- Does not design Wishlist/Reviews/Referral/Gift-Card backends — named as future scope only, consistent with `MODULE:AUTHORITY`'s requirement that a formal module boundary precede design detail.

---

End of Document
