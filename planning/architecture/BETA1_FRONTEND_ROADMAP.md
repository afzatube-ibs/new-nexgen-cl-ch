# neXgen Core — Beta 1 Frontend (Customer Experience Platform) Roadmap

| Field | Value |
|---|---|
| **Status** | Draft — Proposed, pending Product Owner review |
| **Date** | 2026-08-17 |
| **Depends on** | Every `docs/frontend/STORE_FRONTEND_ARCHITECTURE.md`, `THEME_ENGINE_ARCHITECTURE.md` (extended), `LANDING_ENGINE_ARCHITECTURE.md`, `CMS_ARCHITECTURE.md`, `SEARCH_ARCHITECTURE.md`, `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` document produced this same pass |

---

## 1. The One Fact That Governs This Whole Roadmap

`STORE_FRONTEND_ARCHITECTURE.md` §0 and §3.3 establish it: **the real backend has zero customer-facing authentication today.** Every capability that needs to know "which customer is this" — cart persistence past a browser session, checkout as a returning customer, account, order history, wishlist, notifications preferences — is blocked on backend work (a new customer auth guard) that does not exist yet and is explicitly out of this research phase's own authority to build.

Everything that does **not** need customer identity — Home, Category, Brand, Product Detail, Search, CMS-authored landing pages, guest checkout — has **no backend blocker** at all, once the BFF (`STORE_FRONTEND_ARCHITECTURE.md` §3.2) and CMS backend (`CMS_ARCHITECTURE.md`) exist. This single distinction is what makes a real, honest Beta 1 achievable on a realistic timeline: **Beta 1 is a browsing-and-guest-checkout storefront, not a full customer-account platform**, and that scoping is a deliberate, stated recommendation of this document, not an accidental gap.

---

## 2. Milestones, in Dependency Order

### M1 — Storefront Foundation (no backend blocker)
Scaffold `apps/storefront` and `packages/storefront-engine` per `ADR-0009`'s already-settled layout; implement the Theme Engine contract (`THEME_ENGINE_ARCHITECTURE.md` §2.3) and every default primitive (`STOREFRONT_COMPONENT_ENGINE.md` §3) for real; stand up the BFF's Category-A service credential and Route Handlers (`STORE_FRONTEND_ARCHITECTURE.md` §3.2). **Outcome**: a real, live, SEO-indexed Home/Category/Product/Search storefront rendering off real Catalog data, using `packages/ui`'s own plain default components (no theme yet) — a genuinely usable, honest storefront per `THEME_ENGINE_ARCHITECTURE.md` §3 step 4's "always renders something" guarantee, not a placeholder.
*Matches `docs/frontend/README.md`'s own existing "2.2 — Storefront Engine" phase naming — this milestone is that phase, sequenced concretely.*

### M2 — CMS Backend (no backend blocker beyond `MODULE:AUTHORITY`'s own formal-addition process)
Implement `MODULE:CMS` per `CMS_ARCHITECTURE.md` — Pages, Menus, Snippets, draft/publish/schedule, revisions. **Outcome**: a merchant can author a real homepage and real landing pages instead of M1's own default Template arrangement; Menus/Navigation become merchant-editable rather than hardcoded.

### M3 — `nexgen-default` Theme Package
The platform's first real, designed (not merely functional-default) theme, built against M1's already-proven contract. **Outcome**: the storefront stops looking like a functional default and starts looking like a real, designed product, per `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §1's Enterprise UX bar.

### M4 — Guest Checkout, Live
The real, already-built, already-frozen `MODULE:CHECKOUT` backend already supports guest checkout in full (confirmed this research pass) — this milestone is BFF proxy work only (`STORE_FRONTEND_ARCHITECTURE.md` §3.2's pattern extended to Checkout's own routes), **no new backend capability**. **Outcome**: a real customer can browse, add to cart, and complete a real guest purchase, paid through the real, already-Bangladesh-first Payments module — this is the milestone at which neXgen has a genuinely transacting storefront, ahead of any customer-account work.

### M5 — Customer Auth Guard (backend, out of this phase's authority — the single largest remaining item)
A new backend module boundary (`MODULE:AUTHORITY`-governed, its own formal `04_MODULE_ARCHITECTURE.md` addition and its own architecture pass — not designed by this document). **Outcome, once complete**: Account, Profile, Address Book (§`CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §9 — the *smallest* remaining gap once this lands, since Customers' own data model is already real and proven), order history, and authenticated (not just guest) checkout all become buildable with no further backend blocker.

### M6 — Search Upgrade
`SEARCH_ARCHITECTURE.md` §2's engine swap (facets, autocomplete, synonyms, typo tolerance) — no dependency on M5; can run in parallel with M2–M4 once resourcing allows, since it only depends on M1's BFF pattern already existing.

### M7 — Landing & Funnel Engine Flagship Features
`LANDING_ENGINE_ARCHITECTURE.md` §3.2–§3.6 (Instant Checkout, order bumps/upsells, split testing, server-side tracking, conversion dashboard) — depends on M2 (CMS Pages) and M4 (real Checkout live); this is deliberately sequenced *after* a working transactional storefront exists, not before, since every one of its own differentiating claims (§`LANDING_ENGINE_ARCHITECTURE.md` §1) depends on the real Checkout/Promotions path already being live to compose against.
*Matches `docs/frontend/README.md`'s own existing "2.3 — Landing & Conversion Engine" phase naming.*

### M8 — Wishlist, Reviews, Account depth
Depends on M5 and on the respective Phase 2 backend modules (`IMPLEMENTATION_MASTER_PLAN.md` §§20–21) being formally added and built — genuinely later work, not Beta 1 scope.

---

## 3. What Ships in "Beta 1," Concretely

**In scope**: M1–M4 (and M6 if resourcing allows in parallel). A real, fast, SEO-real, themed, guest-checkout-capable storefront selling real Catalog products at real Pricing/Promotions-evaluated prices, paid through real Payments gateways.

**Explicitly not in Beta 1**: customer accounts, order history, wishlist, reviews, referral, gift cards, the full Landing/Funnel Engine flagship feature set (M7) — each named, each sequenced, none silently dropped.

This scoping is the single most important scheduling decision in this entire research pass: it turns "the Storefront needs a from-scratch customer identity system before anything can ship" (a multi-month blocker) into "a real, transacting Beta 1 ships on M1–M4, and the identity system is M5, sequenced in parallel with M6/M7 planning rather than gating everything else."

---

End of Document
