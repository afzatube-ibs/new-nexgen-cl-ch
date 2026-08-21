# Beta Experience Map — Merchant & Customer

| Field | Value |
|---|---|
| **Status** | Planning artifact — a screen/flow inventory and classification, not an implementation spec. No code was written to produce this document. |
| **Method** | Every screen listed below was confirmed to exist by enumerating real page components directly (`find ... -iname "*Page.tsx"` across every `apps/admin` module, every `apps/storefront` route) — not recalled from memory. Classification (Exists / Needs Redesign / Missing Entirely) is grounded in direct source reads performed in this session and in `EVIDENCE_BASED_PLATFORM_AUDIT.md`. |
| **Relationship to other documents** | This map does not replace `NEXGEN_PRODUCT_MASTER_VISION.md` (the long-term "why") or `EVIDENCE_BASED_PLATFORM_AUDIT.md` (the completion/blocker audit) — it is the concrete screen-by-screen inventory both of those documents implied but never enumerated. |
| **Sequencing note** | This map is preparation, not a change of plan. `EVIDENCE_BASED_PLATFORM_AUDIT.md` Part 9 recommended Checkout↔Shipping↔Payment integration (Sprint 1) *before* a visual redesign sprint (Sprint 2), specifically so redesigned screens aren't built against data contracts that don't exist yet (real prices, real stock, a submittable Checkout). That recommendation is unchanged by this document — a screen map costs nothing to produce now and is genuinely useful prep either way, but the *build order* question this map does not answer is still open and still governed by that audit. |

---

## Part 1 — Merchant Experience Map (`apps/admin`)

### 1.1 Navigation architecture, as it actually exists

A single sidebar, ten registered modules, each contributing its own real routes through the Module Registration Framework (`apps/admin/src/modules/index.ts`) — confirmed, unchanged since the Evidence-Based Audit:

```
Dashboard
Catalog        → Products, Brands, Categories, Collections, Tags, Attributes, Attribute Groups, Options
Inventory      → Warehouses, Stock Levels, Transfers, Activity
Pricing        → Price Lists, Tax Zones, Tax Classes, Tax Rates, Price Tools (Lookup, Missing Price Detection,
                  Currency Coverage, Checkout Price Preview)
Customers      → Customer List, Customer Detail, Activity
Orders         → Order List, Order Detail, Activity
Shipping       → Zones, Methods, Rates, Shipments, Activity
Payments       → Payments List, Payment Detail, Activity
Marketing      → Promotions, Redemptions, Promotion Tester, Activity
Settings       → (framework only — see 1.3)
```

### 1.2 Every real screen, classified

| Module | Screen | Status |
|---|---|---|
| **Dashboard** | Dashboard home | **Exists (framework), Missing (content)** — real widget-registration framework, confirmed zero widgets registered by any of the 9 business modules. This is simultaneously "built" and "empty." |
| **Catalog** | Products List | Exists — functionally mature. Needs Redesign for merchandising-grade visual density (see 1.4). |
| | Product Form (create/edit) | Exists — real tabs (General/SEO; Variants/Media/Organization deferred per Catalog Slice 2 scope). |
| | Brands / Categories / Collections / Tags List | Exists — consistent shared CRUD pattern. |
| | Attribute Groups / Attributes / Options List | Exists — same pattern. |
| **Inventory** | Warehouses List | Exists, real. |
| | Stock Levels | Exists, real — KPI summary, reservations, holds all real. |
| | Transfers List | Exists, real (newly discovered uncommitted feature — see commit plan). |
| | Activity | Exists, real — including real Transfer-event rendering. |
| **Pricing** | Price Lists | Exists, real. |
| | Tax Zones / Classes / Rates | Exists, real (newly discovered uncommitted feature). |
| | Price Tools: Lookup, Missing Price Detection, Currency Coverage, Checkout Price Preview | Exists, real — genuinely sophisticated merchant/ops tooling. |
| **Customers** | Customer List / Detail / Activity | Exists, real — staff-facing only (no customer-facing account exists; Category B). |
| **Orders** | Order List / Detail / Activity | Exists, real. |
| **Shipping** | Zones / Methods / Rates | Exists, real. |
| | Shipments List / Detail | Exists, real. |
| | Fulfillment Activity / Shipping Activity | Exists, real (two separate audit logs — worth a UX pass on why there are two, not one, when this map moves to redesign). |
| **Payments** | Payments List / Detail / Activity | Exists, real. |
| **Marketing** | Promotions List / Detail | Exists, real. |
| | Redemptions | Exists, real. |
| | **Promotion Tester** | **Exists, but Needs Redesign or Relocation** — confirmed (again) a raw developer/QA utility (type-a-UUID-into-a-text-field), reachable from the same navigation a merchant uses. Two real options: redesign it into a real merchant-facing "test a coupon" tool (product picker instead of raw ID entry), or move it behind a developer/debug surface not in primary navigation. Not a redesign of *decoration* — a redesign of *audience*. |
| | Marketing Activity | Exists, real. |
| **Settings** | Settings home | **Exists (framework), Missing (content)** — confirmed this session: the panel-registration framework is real, but *no module registers a panel* (`grep` across every module found zero `registerSettingsPanel` calls outside the Settings module's own files). A merchant has no screen to change the store name, currency default, locale, timezone, or (see 1.3) any branding — even though the real backend `Store` model already has most of these fields. |

### 1.3 The concrete branding gap, restated precisely for this map

Re-confirmed from source: `StoreResource` (`apps/backend`) returns `name`, `legalName`, `currencyCode`, `locale`, `timezone`, contact info, address — **no `logoUrl`, no brand color, no theme field of any kind, anywhere in the backend.** This means "merchant-configurable branding" is not a Settings-screen gap alone — it is a **backend data-model gap first**, and a Settings-screen gap second. Any redesign work here has two real, sequenced pieces: (a) add the missing fields to the real `Store` model/backend, (b) build the Settings screen and Storefront consumption that uses them. Building (b) without (a) would be exactly the kind of "redesigned Storefront disconnected from real contracts" the audit's own sprint rules warn against.

### 1.4 Merchant workspaces that do not exist at all

Per `NEXGEN_PRODUCT_MASTER_VISION.md` §§2–8, none of the following exist as any screen, framework, or partial implementation — listed here for completeness of the map, not as a near-term build recommendation:

- **Merchant Command Center** (the Vision's own Mission Control — Dashboard's real content is a subset of this, not the whole thing)
- **Merchant Health Center** (the twelve-dimension scoring system)
- **Growth Operating System** (unified Audience/Attribution/Creative workspace)
- **Commerce Intelligence** (AI-first "why did sales drop" reporting)
- **AI Commerce Copilot**
- **Automation Studio**
- **Onboarding / setup checklist**
- **Store branding/theme configuration** (1.3, above)

---

## Part 2 — Customer Experience Map (`apps/storefront`)

### 2.1 The real navigation flow, as it exists today

```
Home (/)
 ├─ Category (/categories/{id}-{slug})  ──┐
 ├─ Brand (/brands/{id}-{slug})           ├─→ Product Detail (/products/{id}-{slug})
 ├─ Collection (/collections/{id}-{slug})─┘        │
 └─ Search (overlay, not a route)                  │
                                                     ▼
                                        Add to Cart → Cart Drawer / Cart page (/cart)
                                                     │
                                                     ▼
                                        Checkout (/checkout) — real form, honest boundary
                                                     │
                                                     ✕  (cannot submit — Category B)
                                                     
Order Lookup (/orders/lookup) — real, live, standalone entry point (not reachable from a completed order, since none can complete yet)
```

**Account, Wishlist (persistent), Returns, Reviews (submission), Support — no route exists for any of these.** Not "hidden" or "unfinished" — genuinely absent from the route tree, confirmed by direct enumeration.

### 2.2 Every real screen, classified

| Screen | Status | Note |
|---|---|---|
| **Home** (`/`) | Exists, **Needs Redesign** | Real, real data (5 independently-fetched sections, real ISR/SEO). Hero copy is the literal hardcoded `"Welcome to the store"`. Zero brand identity. This is the single clearest "generic template" screen in the whole platform. |
| **Category** (`/categories/[idSlug]`) | Exists, **Needs Redesign** | Real filters (Category/Brand), real URL-state, real pagination, real grid/list toggle. Visually a plain bordered-card list — the Product Owner's own named example, confirmed accurate. |
| **Brand** (`/brands/[idSlug]`) | Exists, **Needs Redesign** | Same underlying pattern as Category. |
| **Collection** (`/collections/[idSlug]`) | Exists, **Needs Redesign** | Same underlying pattern. |
| **Search** (overlay) | Exists, **Needs Redesign** | Real, functional; not independently re-audited visually this session. |
| **Product Detail** (`/products/[idSlug]`) | Exists, **Needs Redesign** | Real gallery/zoom/fullscreen, real Reviews/Q&A empty states, real ShippingCalculator, real desktop+mobile Add to Cart. No real price, no real stock quantity, no wired variant selector (nothing real to select from yet). |
| **Product Card** (used across Home/Category/Brand/Collection/Search) | Exists, **Needs Redesign** | The Product Owner's own second named example. Functionally strong (real Quick Add, Quick View, honest badges, skeleton). Visually a plain rectangle with no merchandising treatment. |
| **Cart Drawer + `/cart` page** | Exists, **Solid — light-touch redesign only** | The platform's clearest Storefront strength. Fully real, fully tested. A visual pass here is lower-risk and lower-priority than Home/Category/PDP, since the underlying data (cart lines) is already real and complete — no contract gap to worry about. |
| **Checkout** (`/checkout`) | Exists, **Redesign only after Sprint 1 integration** | Real, fully-validated form. Cannot submit. This is the one screen where the audit's own caution applies most directly — a prettier Checkout still can't take a real payment until Shipping/Payment composition lands. |
| **Order Lookup** (`/orders/lookup`) | Exists, **Needs Redesign, low priority** | Real, live, honestly bounded. Low traffic today since no order can ever complete to be looked up. |
| **Order Success** | **Missing entirely (as a live route)** | Real components exist (`OrderConfirmationSummary`) but no page reaches them — no real Order can exist yet. |
| **Account** | **Missing entirely** | No route, no backend guard (Category B). |
| **Wishlist (persistent)** | **Missing entirely** | Local-only today (Quick Actions have an honestly-inert wishlist button); no persistent backend. |
| **Returns** | **Missing entirely** | No route, no backend. |
| **Reviews (submission)** | **Missing entirely** | Real display components with honest empty states exist on PDP; no submission flow, no backend domain. |
| **Support** | **Missing entirely** | No route, no surface of any kind. |

### 2.3 Cross-cutting design assets already available for the redesign work

Worth naming explicitly since it changes how big the eventual redesign sprint actually is: the Storefront already consumes `@nexgen/ui` (confirmed — `CheckoutForm`, `AddToCartButton`, and others import `Button`/`Input`/`Dialog` etc. directly from it), which means the **Design Foundation Refresh** (`packages/ui`, `packages/tokens` — currently uncommitted, per the commit plan) already benefits the Storefront the moment it's committed, with zero additional Storefront-specific token work required. The redesign gap is Storefront-*specific* merchandising and layout — hero treatment, product-card visual density, category-page layout rhythm — not the underlying design-token system, which is already shared and already being refreshed.

---

## Part 3 — Master Classification Table

| Status | Merchant (Admin) | Customer (Storefront) |
|---|---|---|
| **Exists, solid, low redesign priority** | Catalog, Inventory, Pricing, Customers, Orders, Shipping, Payments (core CRUD screens across all seven) | Cart Drawer + `/cart` |
| **Exists, needs redesign (visual only — data contracts already real)** | — | Home, Category, Brand, Collection, Search, Product Card, Product Detail |
| **Exists, needs redesign but gated on integration work first** | — | Checkout, Order Lookup |
| **Exists as framework only, zero real content** | Dashboard, Settings | — |
| **Exists but built for the wrong audience** | Promotion Tester | — |
| **Missing entirely — no route/screen of any kind** | Merchant Command Center, Health Center, Growth OS, Commerce Intelligence, AI Copilot, Automation Studio, Onboarding | Order Success (live), Account, persistent Wishlist, Returns, Review submission, Support |
| **Missing entirely — backend precondition, not just a screen** | Store branding fields (logo/color/theme) | Customer auth (Category B) — blocks Order Success, Account, Reviews, persistent Wishlist simultaneously |

---

## Part 4 — What This Map Does Not Decide

This document intentionally stops at classification. It does not sequence a redesign sprint, does not propose new visual direction, and does not write or modify any code — per the instruction this map was requested under. The build-order question (redesign now vs. after Sprint 1's Checkout↔Shipping↔Payment integration) remains governed by `EVIDENCE_BASED_PLATFORM_AUDIT.md` Part 9 until a new decision explicitly supersedes it.
