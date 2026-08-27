# Beta Experience Pack 1 — Completion Report

**Date:** 2026-08-26
**Scope:** Global Design System v1 · Merchant Appearance Workspace (Branding) · Store Branding backend · Global Store Header · Global Footer · Product Card System v3 · Category Page v3 · Product Detail Buy Box v3

Everything in this pack was built end-to-end (backend → gateway → storefront/admin), quality-gated, and live-verified in a running browser against a real backend and real seed data. No page outside this pack's scope (Checkout, Homepage, Search, Collections, Cart, Order Success, Customer Account, Reviews, CMS, Theme Studio, Landing Builder) was touched.

---

## 1. Backend additions

**New module:** `App\Domains\Platform\Appearance` (mirrors the existing `StoreConfiguration`/`Media` module shape exactly — Actions/Models/Http/Authorization/Audit/Console/Providers/routes, per this codebase's own "each module keeps its own copy of small infrastructure" contract).

- **`store_appearances` table** — one row per store: logo/favicon (`MediaAsset` FK references, never raw URLs), primary/secondary/accent color, border radius, typography preset, button style, announcement bar (enabled + text), WhatsApp/Messenger/Facebook/Instagram/TikTok/YouTube links, business hours (JSON), plus `published_snapshot` (JSON) + `published_at`/`published_by` + `lock_version` for optimistic locking.
- **Draft/Publish/Reset**, without a full version-history table: the draft fields live directly on the row; **Publish** copies the tracked fields into `published_snapshot`; **Reset** restores the draft from the snapshot; `isPublished()` / `hasUnpublishedChanges()` are computed by diffing the two. Real, working, no fabricated "version history" UI over data that doesn't exist.
- **Permissions:** `appearance.branding.view`, `appearance.branding.manage`, `appearance.audit_log.view` — seeded idempotently, auto-granted to Administrator, following the `<module>.<resource>.<action>` convention.
- **Audit logging** on every update/publish/reset, its own `appearance_audit_logs` table (per-module copy, same pattern as other modules).
- **Endpoints:** `GET/PATCH stores/{store}/appearance`, `POST .../publish`, `POST .../reset`, `GET appearance/audit-logs` — all optimistic-locked (409 on conflict), all permission-gated.
- **Gateway credential grant:** the Storefront Service Account was granted `appearance.branding.view` (and `store_configuration.stores.view`, needed for the header/footer to resolve store name/contact fields), so the public storefront can read **only the published snapshot** — never a merchant's unpublished draft.
- **`updateStore()`** added to the real, already-existing `PATCH /stores/{id}` — Store's own real fields (name, currency, locale, timezone, contact, address) are edited through the Branding UI but persisted via Store's own endpoint, not duplicated into the new table.

A real bug was caught and fixed live during this work: `firstOrCreate(['store_id' => ...])` was silently dropping `store_id` because it wasn't in `$fillable` — caused a real 500 on first-ever appearance fetch for a store. Fixed and confirmed via a live re-test.

## 2. Frontend additions

### Design System v1
Audited `packages/ui` and `packages/tokens` first rather than rebuilding — the full checklist (typography, spacing, elevation, radius, buttons, inputs, cards, badges, status chips, drawer, modal, dropdown, tables, tabs, toast, tooltip, skeletons, empty/error states, motion tokens, breakpoints) was already real and complete. Nothing was duplicated. The one genuine gap — a **Command Palette** — is deliberately **not built** this pack (named below as remaining work); a handful of new merchandising badges (`CodAvailableBadge`) were added where genuinely missing.

### Merchant Appearance Workspace — Branding (`apps/admin`)
New `appearance` module (`registerModule` — zero Shell/Sidebar changes needed): Brand Identity, Brand Colors, Typography, Logo/Favicon upload (via the existing `MediaAsset` pipeline), Social Links, Business Information, a live preview pane, and Save / Publish / Reset actions wired to the new backend endpoints with real optimistic-lock conflict handling.

A real TanStack Query cache-collision bug was found and fixed live: two hooks shared the `['stores']` query key with different return shapes (single object vs. array); whichever populated the cache first "won" for every observer, crashing the Branding form. Fixed by standardizing both consumers on the same shape.

### Global Store Header & Footer (`packages/storefront-engine`)
Both rewritten to consume real `branding` data from the Gateway (`getBranding()`) instead of hardcoded strings: real logo, real announcement bar, real WhatsApp CTA, real social links, real support email/phone, and — reusing existing real components rather than duplicating — the same `PaymentMethodsRow`/`CourierBadge` trust rows the Buy Box uses.

### Product Card v3
Added `CodAvailableBadge`, grounded in the real, live, credential-free `cod` payment gateway (Sprint 5) — not fabricated. Docblock updated to "v3."

### Category Page v3
Sticky filter sidebar, promotion banner, "Recommended for you" rail (real `getRecommendations({slot:'trending'})`), and a Recently Viewed rail — all real data, no fabricated merchandising.

### Product Detail Buy Box v3
- New **`BuyNowButton`** (`'use client'`, exported via the `/client` sub-barrel): adds a real cart line via the same `cartStore.addItem` `AddToCartButton` already uses, then navigates straight to the real, already-built `/checkout` — no new checkout logic, no bypass of real validation.
- **COD availability badge**, **trust row** (secure payments / nationwide delivery), **payment methods row**, **delivery-partner row** — all real, backend-grounded signals.
- **Bundle / Cross-sell / Frequently-bought-together**: built as one honest "More ways to buy" placeholder card (matching this codebase's own established `PromoCodePlaceholder` pattern) stating plainly that no bundling/co-purchase backend exists yet, and pointing at the real "Related products" / "You may also like" rails as today's real substitute — never fabricated product data.

---

## 3. Quality gates

| Gate | `packages/storefront-engine` | `apps/storefront` |
|---|---|---|
| Typecheck (`tsc --noEmit`) | ✅ clean | ✅ clean |
| Lint (`eslint .`) | ✅ clean | ✅ clean (fixed one `react/no-unescaped-entities` on the new placeholder copy) |
| Tests (`vitest run`) | ✅ 88/88 passed, 12 files | — (app has no test files; pre-existing, not introduced by this pack) |
| Production build (`next build`) | — | ✅ exit 0, all 12 routes built (the `ECONNREFUSED`/`fetch failed` lines during static generation are the existing, honest fallback-data path when no backend is reachable at build time — not a new error) |

Backend PHPStan and the Appearance module's own permission/audit/optimistic-locking wiring were verified clean earlier in this pack (prior to this session's continuation).

## 4. Live browser verification

Ran the full stack locally (Laravel backend on :8080 via PHP 8.4, the Node/Fastify Gateway on :4000, Next.js storefront on :3000) against real seed data (a real product, "Premium Wireless Headphones," and a real category).

- **Desktop (1280×900):** PDP renders the full v3 Buy Box — Add to cart + Buy now side-by-side, COD badge, trust row, payment methods, delivery partners, and the new honest bundle/cross-sell placeholder — no console errors.
- **Mobile (375×812):** same Buy Box stacks correctly full-width; the pre-existing sticky mobile buy bar does not overlap the new content.
- **Interaction:** clicked "Buy now" — confirmed via `localStorage` that a real cart line was added (`productId`, real SKU, real image URL, `quantity: 1`) and the browser navigated to the real `/checkout`, which rendered the real 1-item checkout form. Confirms the full Buy Box v3 chain end-to-end.
- **Category page:** sticky sidebar filters, sort, product grid with COD badges, and the "Recommended for you" rail all render correctly.
- **Header/Footer:** confirmed rendering real branding data — store name, support email/phone, WhatsApp link, payment methods, courier partners, copyright — sourced from the new Appearance backend through the Gateway's published-snapshot-only `branding` route.
- **Accessibility:** spot-checked via the accessibility tree — every interactive control (including disabled/"coming soon" states) carries a real, descriptive `aria-label`.
- **404 handling:** confirmed the storefront's existing honest not-found page still works correctly (unaffected by this pack).

One unrelated, pre-existing environment issue was found and is **not** a code defect: the default `php` on this machine is 8.3, but this Laravel app requires 8.4+; worked around by invoking the PHP 8.4 binary directly to start the dev server for verification. No code change was made for this — it is an environment/tooling note, not a product bug.

## 5. Deliberately deferred / honest gaps (not silently omitted)

- **Command Palette** — not built this pack; the existing Design System already covers everything else on the checklist.
- **Ratings/reviews, delivery-estimate badges, campaign/countdown/bundle badges, second product image, per-card Wishlist/Compare** — no real backend data source exists for any of these yet (Reviews is itself out of this pack's scope); not faked.
- **Wishlist/Compare/Language/Currency switchers in the Header** — no real backend for any of them yet.
- **Theme Studio, full site-wide dynamic re-theming** beyond the Header/Footer/Buy Box accents built this pack — explicitly out of scope per the brief ("Do NOT build Theme Studio yet").
- **Product specifications/attributes, downloads** — the real `ProductDetail` payload has no such field yet (Milestone 1 scope).

---

## Stop

Per the brief's own instruction, this pack stops here. Homepage and Checkout were not touched and will not be started automatically.
