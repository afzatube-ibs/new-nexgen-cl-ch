# Beta Experience Blueprint — neXgen as a Commerce Operating System

| Field | Value |
|---|---|
| **Status** | Design blueprint — the visual/experiential target for Beta 1. No code was written to produce this document. |
| **Relationship to other documents** | Builds directly on `NEXGEN_PRODUCT_MASTER_VISION.md` (the *why*) and `BETA_EXPERIENCE_MAP.md` (the *what exists, screen by screen*). This document is the *how it should feel* — reorganized around Workspaces, not modules, per instruction. |
| **Sequencing** | Unchanged from `EVIDENCE_BASED_PLATFORM_AUDIT.md` Part 9: this is the design target Sprint 2 (post-integration) builds toward, not an instruction to build it before Sprint 1. This document itself is pure design work and required no build-order decision to produce. |

---

## 0. The Design Point of View

**Neither of these is the goal**: a Silicon Valley SaaS-clone dashboard, or a Daraz-style dense marketplace page. Both are genuine failure modes for this platform specifically. The point of view that resolves the tension:

> **neXgen looks like Apple's restraint met Amazon's rigor, running on Daraz's own market fluency.**

Concretely, benchmarked:

- **Apple** — typographic hierarchy carries the design, not color or ornament. Generous whitespace where it earns its keep (hero moments, Command Center headline); *zero* whitespace-for-its-own-sake where a merchant needs density (data tables, order lists). One idea per screen region, stated plainly.
- **Nike** — merchandising moments (Home hero, category banners, campaign strips) get real imagery, real motion, real confidence — this is the *permission* to be visually bold exactly where Apple's restraint would otherwise make every neXgen store look identical to every other one. The trust-bar/product-grid parts of the page stay restrained; the *few* moments meant to sell a feeling get to be loud.
- **Amazon** — the conversion machinery (price, stock, delivery promise, trust signals, reviews, cart) is never sacrificed for aesthetics. Density is a feature there, not a bug. Every gram of Nike's boldness above stops at the edge of the buy box.
- **Daraz** — COD-first, phone-first, BDT-native, festival-aware. Not imitated visually (Daraz's own density and banner-clutter is a bar to clear, not to match) but *market-fluent* in exactly the way Daraz is and Shopify/Amazon are not.
- **Shopify Horizon** — the closest sibling in spirit: block-based, merchant-flexible, restrained-but-warm. Where neXgen should differ: Horizon is a *theme*; neXgen's own Command Center/Health Center/AI layer around it is a category Horizon doesn't compete in at all.
- **EasyCommerz** — the regional bar every merchant currently compares neXgen to. Functionally comparable already (Bangladesh payment/courier depth); visually, EasyCommerz reads as a generic template. This is the one benchmark neXgen must clearly, visibly *exceed*, not merely match.

**Three signature moves that make neXgen memorable, not generic** (named here as design intent, not implemented):

1. **The Morning Briefing** — every merchant login opens on one interpreted sentence (`NEXGEN_PRODUCT_MASTER_VISION.md` §2), not a grid. No competitor in this benchmark set opens a merchant's day with a sentence instead of a dashboard.
2. **The Buy Box never competes with the page around it** — on the Storefront, exactly one visual weight class is reserved for price/stock/CTA, and nothing else on the page (not even hero imagery) is allowed to compete with it for the eye. This is the Amazon discipline, made a hard design rule rather than a suggestion.
3. **COD is drawn with the same visual confidence as a credit card**, everywhere it appears — never a smaller, greyed-out, "secondary" option. This single, consistent choice is more market-fluent than any amount of Bangla copy would be on its own.

---

## Part 1 — Merchant Workspaces

Nine workspaces. Every real module from `BETA_EXPERIENCE_MAP.md` Part 1 is accounted for below — none dropped, none invented from nothing; each is *re-homed* into the workspace it actually serves.

### 1.1 Sell Workspace
*Everything that makes a product exist, look right, and cost the right amount.*

- **Re-homes**: Catalog (Products, Brands, Categories, Collections, Tags, Attributes, Options), Pricing (Price Lists, Tax, Price Tools).
- **Navigation**: Products · Collections · Pricing & Tax · Price Tools — four tabs, not eight sidebar items.
- **Purpose**: the merchant's own answer to "what am I selling, and for how much."
- **Primary actions**: Add a product. Bulk-edit prices. Check "what's missing a price" (Missing Price Detection, already real). Preview what a customer would actually pay at checkout (Checkout Price Preview, already real).
- **KPIs**: Catalog size and health (published vs. draft, missing-price count — real, from Missing Price Detection). Average margin by category (real, once Pricing's own cost data is surfaced — currently backend-only).
- **AI**: "12 products have no meta description — these are the ones least likely to surface in search" (Health Center, §4 of the Vision). "This product is trending nationally and you don't have a price set" (a real, valuable cross of Missing Price Detection + a future trend signal).
- **Automation**: reorder-point-triggered price review; auto-flag a product for the Missing Price Detection queue the moment it's created with no price.
- **Reports**: catalog completeness, price coverage by currency (Currency Coverage, already real).
- **Shortcuts**: `⌘K` → "new product," "find SKU," "preview price" — every Price Tool already built is a command, not a click-through.
- **Daily workflow**: a merchant opens Sell once a week, not daily — checks Missing Price Detection, adds anything new, moves on. This workspace should feel *fast to leave*, which is itself a design goal: Sell is maintenance, not where the merchant's attention should live.

### 1.2 Grow Workspace
*Everything that makes a product sell faster, and to more people.*

- **Re-homes**: Marketing (Promotions, Coupons, Redemptions — with the Promotion Tester rebuilt, see 1.9). Houses the future Growth Operating System (Vision §5) in full once built.
- **Navigation**: Campaigns · Promotions & Coupons · Audience · Channels (Meta/Google/TikTok/Email/SMS/WhatsApp) · Landing Pages.
- **Purpose**: the merchant's own answer to "how do I get more orders this week."
- **Primary actions today (real)**: create a promotion, generate a coupon code, check redemption performance. **Primary actions, Vision-complete**: build a campaign against a real shared audience, running on multiple real channels at once.
- **KPIs**: active promotions and their real redemption count (real today). Blended ROAS across channels (Vision-complete only).
- **AI**: "This campaign's ROAS has declined 5 days straight — pause it?" (Vision §6/§7's own canonical example).
- **Automation**: auto-generate a win-back coupon for a customer who hasn't ordered in 60 days (a real Automation Studio chain, once built).
- **Reports**: promotion performance by code, channel-mix health.
- **Shortcuts**: `⌘K` → "new coupon," "duplicate campaign."
- **Daily workflow**: for an active merchant, this is a daily-open workspace — check what ran overnight, what needs a decision today (a fatiguing ad, an underperforming coupon).

### 1.3 Customers Workspace
*Who is buying, and how well the business treats them.*

- **Re-homes**: Customers (List, Detail, Activity). Houses Loyalty/Rewards/Referral/Segments (Vision §9/§13) once built.
- **Navigation**: All Customers · Segments · Loyalty & Rewards · Referrals.
- **Purpose**: the merchant's own answer to "who are my actual customers, not just my orders."
- **Primary actions**: look up a customer, review their real order history, (Vision-complete) build a segment, award/adjust loyalty points.
- **KPIs**: new vs. returning (real, computable from real Orders data today — not yet surfaced). Customer lifetime value by segment (Vision-complete).
- **AI**: "This customer's COD acceptance rate is 40% — consider requiring a deposit" (a genuine Bangladesh-specific Health signal, Vision §11).
- **Automation**: award loyalty points on real order completion (the Vision's own canonical Automation Studio step).
- **Reports**: repeat-purchase rate, cohort retention.
- **Shortcuts**: `⌘K` → "find customer by phone" (phone-first, per Bangladesh design principle).
- **Daily workflow**: mostly reactive — a merchant opens a specific customer record when a support question or an order flag brings them here, rather than browsing the list top-down.

### 1.4 Orders Workspace
*Every real transaction, from placed to paid to closed.*

- **Re-homes**: Orders (List, Detail, Activity) **and Payments** (List, Detail, Activity) — a deliberate design decision, not an omission: payment status is a real, intrinsic part of one order's own lifecycle, not a separate business object a merchant thinks about independently. Payment detail lives as a real tab *inside* Order Detail, the way Shopify's own Order page already treats it, rather than as a same-level sibling workspace.
- **Navigation**: All Orders · (within an order) Details · Payment · Fulfillment · Timeline.
- **Purpose**: the merchant's own answer to "is this order handled."
- **Primary actions**: find an order, capture/refund a payment, mark fulfilled, add an internal note.
- **KPIs**: orders today/this week vs. last, average time-to-ship, payment success rate by gateway.
- **AI**: "3 orders have been in 'processing' for over 48 hours" (a real, computable staleness signal from real Order status + timestamps).
- **Automation**: the Vision's own canonical chain — order placed → reserve stock → notify → create shipment → invoice.
- **Reports**: revenue by day/week/month, payment-method mix, fulfillment SLA.
- **Shortcuts**: `⌘K` → "find order #," "today's orders."
- **Daily workflow**: the single most-visited workspace for an active merchant — opened first, multiple times a day, always sorted to "needs attention" first.

### 1.5 Operations Workspace
*Getting the right product to the right place.*

- **Re-homes**: Inventory (Warehouses, Stock Levels, Transfers, Activity) and Shipping (Zones, Methods, Rates, Shipments, Activity).
- **Navigation**: Stock Levels · Warehouses · Transfers · Shipping Zones & Rates · Shipments.
- **Purpose**: the merchant's own answer to "do I have it, and can I get it there."
- **Primary actions**: adjust stock, initiate a transfer between warehouses, book/track a shipment, configure a shipping zone.
- **KPIs**: stockout risk count, on-time delivery rate by courier (Health Center's own Shipping dimension, Vision §4), dead-stock value.
- **AI**: "Steadfast is 94% on-time on this route; Pathao is 78% for the same route — rebalance?" (the Vision's own canonical Bangladesh example).
- **Automation**: reorder suggestion at a computed (not static) reorder point; auto-flag a warehouse blocked by a pending transfer (the real `DeleteWarehouseAction` guard, already built, surfaced here as a real signal rather than only an error message).
- **Reports**: stock aging, courier performance comparison.
- **Shortcuts**: `⌘K` → "find SKU stock," "new transfer."
- **Daily workflow**: opened daily by a fulfillment-focused staff role, weekly by the owner — the one workspace most likely to have a dedicated Team member (Vision §10) rather than the owner personally.

### 1.6 AI Workspace
*The Copilot, and everything it automates.*

- **Houses (net new)**: Daily/Weekly/Monthly Briefings, Automatic Detection/Recommendation feed, and **Automation Studio** — deliberately folded in here rather than made a tenth workspace: Automation is the Copilot's "acts," Briefings/Recommendations are its "advises," and keeping both under one roof is what makes the Vision's own consent boundary (§7/§14 — recommends vs. executes) visible as one continuous surface, not two disconnected products.
- **Navigation**: Briefings · Recommendations · Automations (the visual workflow builder) · Templates.
- **Purpose**: the one workspace whose entire job is *doing the merchant's thinking with them, not for them*.
- **Primary actions**: read today's briefing, accept/dismiss a recommendation, build or enable an automation from a template.
- **KPIs**: hours saved (estimated, computed honestly from real automations actually running — never a fabricated number), recommendations acted on vs. dismissed.
- **AI**: this workspace *is* the AI — every other workspace's "AI" row above is this workspace's own output, surfaced contextually where the merchant already is.
- **Automation**: the builder itself lives here; templates ship for order-to-delivery, abandoned-cart recovery, win-back, review-request.
- **Reports**: automation run history, real success/failure counts per workflow (never hidden — the Vision's own transparency principle, §14, applied to automation specifically).
- **Shortcuts**: `⌘K` → "new automation from template."
- **Daily workflow**: the Briefing is read every morning, everywhere else in this workspace is visited when something needs building or reviewing — genuinely a "check in, act, leave" workspace by design.

### 1.7 Insights Workspace
*What the numbers mean, and how healthy the business actually is.*

- **Houses (net new)**: real Dashboard content (currently zero widgets — this is where they belong), Commerce Intelligence (Vision §6), and the **Merchant Health Center** (Vision §4) — folded in here rather than a tenth workspace, since a Health score is, structurally, a specific kind of report.
- **Navigation**: Overview · Sales · Marketing · Customers · Inventory · Health Score.
- **Purpose**: the merchant's own answer to "how is the business actually doing, and why."
- **Primary actions**: ask a real question in plain language ("why did sales drop?"), drill from a KPI into its own evidence, review the twelve Health dimensions.
- **KPIs**: this workspace *is* the platform's KPI surface — revenue, profit, cashflow, the twelve Health scores, and the one composite 0–1000 Business Health number (Vision §4).
- **AI**: the four canonical questions from Vision §6, answered with evidence, not just a chart.
- **Automation**: none directly — this workspace observes, others act.
- **Reports**: everything — this workspace is where `MODULE:REPORTING`'s six intelligence domains (`INSIGHTS_PLATFORM_ARCHITECTURE.md`) actually surface to a merchant.
- **Shortcuts**: `⌘K` → "why did revenue change," "show health score."
- **Daily workflow**: opened once a day (the Command Center's own headline is a summary of this), deeply once a week (the Weekly Briefing), deeply once a month (Monthly Review, Vision §7).

### 1.8 Settings Workspace
*Operational configuration — the things that are true about the business, not how it looks.*

- **Re-homes**: the real Settings framework (currently zero panels — every module below registers a real one here for the first time).
- **Navigation**: Store Info · Currency & Locale · Tax Defaults · Team & Roles · Payments & Couriers (credential management) · API & Integrations · Audit Log.
- **Purpose**: the merchant's own answer to "what is true about how my business is configured."
- **Primary actions**: set store name/currency/timezone (the real `Store` fields, currently unconsumed by any screen), invite a staff member, configure a payment gateway's real credentials.
- **KPIs**: none — this is a configuration workspace, not a performance one, deliberately.
- **AI**: "Your bKash credentials haven't rotated in 11 months" (Health Center's Security dimension, Vision §4).
- **Automation**: none directly.
- **Reports**: the unified cross-module audit view (Vision §10's Enterprise Experience).
- **Shortcuts**: `⌘K` → "invite staff," "rotate credentials."
- **Daily workflow**: opened rarely, by design — a well-built Settings workspace is one a merchant sets up once and revisits only for a real change.

### 1.9 Appearance Workspace
*How the business looks to a customer — deliberately separate from Settings.*

- **Houses (net new — this is the direct answer to `BETA_EXPERIENCE_MAP.md` §1.3's branding gap)**: logo upload, brand color, typography preference, homepage hero/merchandising controls, Storefront preview, and (Vision-complete) Theme selection from the future Theme Marketplace.
- **Navigation**: Brand Identity (logo/colors/type) · Homepage Layout · Storefront Preview · Themes.
- **Purpose**: the merchant's own answer to "does my store *look* like my brand" — the single workspace name that most directly answers the Product Owner's own original concern (the Storefront "resembles a basic ecommerce template").
- **Primary actions**: upload a logo, set a brand color, edit the homepage hero, preview the real Storefront live as changes are made.
- **KPIs**: none.
- **AI**: "Your brand color has low contrast against your button text — this may fail accessibility" (a real, buildable check once brand color exists as a field).
- **Automation**: none directly.
- **Reports**: none.
- **Shortcuts**: `⌘K` → "preview storefront."
- **Daily workflow**: opened rarely after initial setup, exactly like Settings — but the *first* workspace a brand-new merchant should ever be guided into (the missing Onboarding flow, Vision §12, should open here before anywhere else).

### 1.10 Promotion Tester, resolved

Per `BETA_EXPERIENCE_MAP.md` §1.2: rebuilt, not simply restyled, as a real feature inside **Sell → Pricing & Tax → Price Tools** (alongside Missing Price Detection, which it structurally resembles) *or* **Grow → Promotions**, whichever a merchant would actually look for it under — recommend Grow, since a merchant thinks of "will this coupon work" as a marketing question, not a pricing one. Redesigned interaction: a real product/SKU picker (reusing the same Price Lookup pattern already built in Sell), never a raw text field asking for a UUID.

---

## Part 2 — Customer Experience Redesign

Sixteen screens. **Launch Priority** uses the same tier language as `PLATFORM_GAP_REPORT.md` (Critical / High / Medium / Future) so this blueprint reads consistently with the rest of the program's planning vocabulary.

| Screen | Current State | Keep | Remove | Redesign | Missing | Launch Priority |
|---|---|---|---|---|---|---|
| **Home** | Real data (5 sections), hardcoded `"Welcome to the store"` hero, zero brand identity | The real, independently-fetched data sections themselves (category grid, trending, recently added, brand slider) | The literal placeholder hero copy | Hero becomes a real, merchant/Appearance-configured moment (Nike-style imagery + confident CTA) once branding fields exist; product rails get real merchandising density, not a plain grid | Seasonal/campaign hero variants, AI-curated "Trending in your category" (Vision §6) | **Critical** — the single highest-visibility "generic template" screen in the platform |
| **Category** | Real filters/pagination/URL-sync, plain bordered cards | Filter architecture, URL-state, pagination — all genuinely well-engineered | Nothing structural | Card visual density (Amazon-grade information hierarchy: price, badges, rating-when-real all reading at a glance), category banner treatment | Merchandising rules (feature a specific product row within a category) | **High** |
| **Search** | Real overlay, functional | Core search mechanics | — | Result-card treatment matches the redesigned Product Card exactly (never a third visual language) | Search-term suggestions, "no results" merchandised fallback (recommend trending instead of a dead end) | **Medium** |
| **Brand** | Same real pattern as Category | Same | — | Same treatment as Category, plus a real brand-identity header (logo, description) once Brand records carry richer media | Brand story/hero content (CMS-dependent, Future) | **Medium** |
| **Collection** | Same real pattern as Category | Same | — | Same | Same as Brand | **Medium** |
| **Product** | Real gallery/zoom, real Reviews/Q&A empty states, no real price/stock, unwired variant selector | Gallery, honest empty states, real ShippingCalculator | Nothing — every element here is either real or honestly absent | The Buy Box (§0's own signature rule) — price/stock/CTA get the platform's single most disciplined visual treatment, unmistakably the most important thing on the page the instant real pricing exists | Real price display, real stock quantity, wired variant selector (all backend-gated, per `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md`) | **Critical**, but visually gated on Sprint 1's own integration work |
| **Product Card** | Real Quick Add/Quick View, honest badges, plain rectangle | Every real interaction (Quick Add, Quick View, skeleton) | — | Full visual rebuild — this is the single most-repeated component in the entire Storefront, so it is the highest-leverage redesign target per square inch of effort | Secondary/hover image (real backend gap — Catalog carries one image per product today) | **Critical** |
| **Cart** (drawer + page) | Fully real, fully tested, already solid | Everything — this is the platform's strongest screen | — | Light visual pass only (typography/spacing alignment with the new Product Card) | — | **Low** (already good) |
| **Checkout** | Real, fully validated, honest "can't complete" boundary | The honesty itself — never redesign away the disclosed boundary | — | Visual pass *after* Sprint 1 wires real Shipping/Payment — a redesign now would still show placeholder shipping options | Real shipping-rate selection, real payment-method availability | **Critical**, sequenced after integration |
| **Success** | No live route — real components exist, unreachable | `OrderConfirmationSummary`'s real structure | — | N/A until reachable | The live route itself (blocked on Category B / a real Order existing) | **Critical**, blocked |
| **Order Lookup** | Real, live, honest "not available yet" result | The real form and its honesty | — | Visual pass, low effort | Real lookup once Category B exists | **Low** today, **High** once unblocked |
| **Account** | No route at all | — | — | N/A | The entire screen — order history, saved addresses, loyalty status | **Critical**, blocked on Category B |
| **Wishlist** | Local-only, honestly inert UI on Product Card | The honest inert state, as a placeholder | — | N/A until backed | Persistent, cross-device wishlist (Category B) | **Medium** |
| **Reviews** | Real display components, honest empty state, no submission path | `RatingSummary`/`ReviewList`/`QASection`'s real, honest presentation | — | Once backed: a real submission flow, photo upload, merchant-response display | The Reviews backend domain itself — confirmed missing a third independent time across this engagement | **High** — this is the platform's most-repeated gap, and trust-building for a new store is one of the highest-ROI levers this benchmark set (especially Amazon) proves out |
| **Referral** | Nothing exists | — | — | N/A | Everything — referral-code generation, attribution, reward | **Future** |
| **Rewards** | Nothing exists | — | — | N/A | Everything — a real loyalty ledger, tiers, redemption | **Medium** — the Vision's own §16 Should-Have for v1.0, and a real, buildable win once Automation Studio's "award loyalty points" step exists |
| **Support** | Nothing exists | — | — | N/A | Everything — even a simple, real contact surface with order context once Account exists | **Medium** |

---

## Part 3 — Launch Priority, Consolidated

**Critical, and already unblocked (visual work only, real data underneath already exists)**: Home, Product Card, Category/Brand/Collection.

**Critical, but gated on Sprint 1's own integration work**: Product (Buy Box), Checkout, Order Success, Account.

**High**: Reviews backend + UI completion, Order Lookup once unblocked.

**Medium**: Search polish, Rewards, Support, Wishlist persistence.

**Future**: Referral, Theme Marketplace-driven Appearance options.

On the merchant side, mapped the same way: **Sell, Orders, Operations** are functionally Critical-complete already and need only the Sell-workspace regrouping + light visual pass; **Insights and Appearance are the two workspaces with the largest gap between "exists" and "should exist"** — Insights because Dashboard is genuinely empty today, Appearance because it doesn't exist as a concept anywhere in the backend yet, not just the UI.

---

## Stop

This is the visual blueprint requested. No code was written, no screen was redesigned, no commit was created. Awaiting direction on what happens next — whether that is executing the already-approved commit plan, beginning Sprint 1's integration work, or beginning implementation against this blueprint.
