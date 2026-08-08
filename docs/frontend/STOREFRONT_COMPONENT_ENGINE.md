# neXgen Core — Storefront Component Engine

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-08 |
| **Phase** | 2.0 — Frontend Architecture & Design (contracts and inventory only — no component implementation exists yet) |
| **Package** | Primitive contracts live in `packages/ui` (framework-agnostic-shaped props, reusable by any theme); default/fallback implementations also in `packages/ui`, per `docs/frontend/THEME_ENGINE_ARCHITECTURE.md` §3 |
| **Scope boundary** | This is a catalog of reusable **blocks** — never a page, never a layout, never a specific merchant's content. No storefront page is assembled here; that is Phase 2.3+ (Landing & Conversion Engine), which *composes* these primitives, and does not modify them to do so. |

---

## 1. What a "Primitive" Is Here

Each entry below is a **primitive name** in the Theme Engine's own resolution contract (`docs/frontend/THEME_ENGINE_ARCHITECTURE.md` §2.3's `StorefrontPrimitiveName`) plus the **typed props contract** every implementation of it — the default one in `packages/ui`, or any future Theme Package's own — must accept. The contract is what makes a primitive swappable: the Storefront Engine, and the CMS Schema behind it (`docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md`), only ever know about the contract, never about which concrete component is rendering it.

Every primitive is **data-in, markup-out** — it receives already-fetched data and CMS configuration as props; it never fetches its own data (`docs/frontend/THEME_ENGINE_ARCHITECTURE.md` §4's own "no Theme Package fetches data of its own" rule applies equally to the default implementations here, for consistency).

---

## 2. Primitive Inventory

| Primitive | Props contract (shape, not final TypeScript) | Composed of |
|---|---|---|
| **Hero** | `{ heading, subheading?, image, cta?: { label, href } }` | `packages/ui` Button, `next/image` |
| **Banner** | `{ message, tone: 'info' \| 'promo', dismissible?, cta?: { label, href } }` | `packages/ui` Alert-shaped primitive |
| **ProductGrid** | `{ products: ProductSummary[], columns: 2 \| 3 \| 4, pagination?: PaginationProps }` | ProductCard (below), `packages/ui` Pagination |
| **CategoryGrid** | `{ categories: CategorySummary[], columns }` | Card-shaped primitive, `next/image` |
| **BrandSlider** | `{ brands: BrandSummary[] }` | horizontally-scrolling list, `next/image` |
| **FlashSale** | `{ heading, products: ProductSummary[], endsAt: ISODateString }` | ProductGrid, Countdown (below) |
| **Countdown** | `{ endsAt: ISODateString, onExpire?: () => void }` | — (a leaf primitive; pure client-side ticking, hydration-only per `docs/frontend/PERFORMANCE_FOUNDATION.md`'s hydration strategy, since a server-rendered countdown value would be stale the instant it reaches the browser) |
| **TrustBar** | `{ items: { icon: IconName, label: string }[] }` | `packages/ui` Icon |
| **Testimonials** | `{ items: { quote, author, avatar? }[] }` | Card-shaped primitive |
| **FAQ** | `{ items: { question, answer }[] }` | `packages/ui` Accordion (a `packages/ui` primitive not separately listed in `docs/frontend/DESIGN_SYSTEM.md` §2's admin-focused inventory — added here since the storefront's own accordion need, e.g. FAQ disclosure, is real and the admin interface has none; owned by `packages/ui`, available to both apps regardless of which one actually uses it) |
| **StickyBuyBar** | `{ product: ProductSummary, cta: { label, onAddToCart } }` | ProductCard's own condensed variant, Button |
| **ProductCard** | `{ product: ProductSummary, onAddToCart? }` | `next/image`, Badge (sale/out-of-stock), Button |
| **CartDrawer** | `{ items: CartLineItem[], subtotal, onUpdateQuantity, onRemove, checkoutHref }` | `packages/ui` Drawer, ProductCard's condensed variant |
| **CheckoutComponents** | A family, not one primitive — `AddressForm`, `PaymentMethodSelector`, `OrderSummary`, each with its own contract | `packages/ui` Input/Select/RadioGroup/Card |
| **UpsellBlock** | `{ heading, products: ProductSummary[] }` | ProductGrid |
| **CrossSellBlock** | `{ heading, products: ProductSummary[] }` | ProductGrid (same shape as UpsellBlock — deliberately the same primitive under a different CMS-facing name, since the visual/structural need is identical and the only real difference is *which products the backend selects*, a Catalog/Pricing concern, not a rendering one) |
| **RecentlyViewed** | `{ products: ProductSummary[] }` | ProductGrid |
| **RecommendedProducts** | `{ heading, products: ProductSummary[] }` | ProductGrid |

`ProductSummary`, `CategorySummary`, `BrandSummary`, `CartLineItem` are shared shape contracts defined once in `packages/api-client` (mirroring the backend's own Catalog/Orders/Checkout resource shapes) — every primitive above references them rather than each primitive inventing its own product-shape subset, which is exactly the "no duplicated components" discipline extended to data contracts as well as visual ones.

---

## 3. Default Implementations

`packages/ui` ships one real, functional, deliberately plain implementation of every primitive in §2 — not a placeholder, not a "TODO" stub, per Phase 2.0's own "no placeholder pages, no demo code" rule. These defaults exist for two real reasons, not merely to satisfy the rule:

1. **`docs/frontend/THEME_ENGINE_ARCHITECTURE.md` §3's fallback guarantee** — a store with no Theme Package configured still renders a genuinely usable storefront, not a blank page.
2. **A contract is only real once something implements it.** Writing the props contracts in §2 without ever implementing them against real data would leave every shape unverified — the default implementations are what prove each contract is actually sufficient to render something correct, before any Theme Package (Phase 2.3+) ever depends on it.

The default implementations use `packages/tokens`' own base values with no theme override applied (`docs/frontend/DESIGN_SYSTEM.md` §1) — a plain, accessible, unopinionated visual treatment, intentionally not "designed" beyond that, since a specific visual identity is exactly what a Theme Package (not this engine) is responsible for.

---

## 4. What This Document Deliberately Does Not Do

- **No page composition.** Nothing here says "the homepage has a Hero, then a ProductGrid, then Testimonials" — that ordering is CMS-authored content (`docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md`'s Sections), decided per-store by a merchant, never hardcoded here.
- **No visual design decisions** beyond what §3's default implementation needs to be functional — color, spacing, and typography all come from `packages/tokens` (or a Theme Package's own override) unchanged.
- **No new backend capability.** Every primitive above consumes data shapes the backend's own Phase 1 modules (Catalog, Orders, Checkout, Customers) already expose via their REST APIs — this document does not request, and does not require, any backend change.
