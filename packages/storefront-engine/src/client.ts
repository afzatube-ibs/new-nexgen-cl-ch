// @nexgen/storefront-engine/client — a second, deliberately narrow public
// entry point, added Beta Milestone 2.5 after a real, live `next build`
// failure: a Client Component in `apps/storefront` (`ViewTracker.tsx`)
// imported `recordRecentlyViewed` from the package's own main barrel
// (`./index.js`), and Next.js's RSC boundary analysis — which walks a
// Client Component's ENTIRE reachable module graph, not just the one
// export actually used (`packages/ui/COMPATIBILITY.md` §2 already
// documents this exact class of bug for that package) — hit `import
// 'server-only'` inside `gateway/client.ts`, reachable transitively
// through the same barrel, and failed the build.
//
// This is the real, scoped fix `STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md`
// §2.2 named as the long-term correct shape (granular exports so a
// consumer's bundler only analyzes what it actually imports) — applied
// here narrowly, to the one real class of module (client-only browser
// storage helpers) that genuinely never touches `server-only` code,
// rather than the full per-component subpath-exports refactor that
// review named as separately, deliberately out of scope. A Client
// Component in `apps/storefront` that needs one of these should import
// from `@nexgen/storefront-engine/client`, never the main barrel.
export * from './components/recentSearches.js';
export * from './components/recentlyViewed.js';

// Beta Sprint 3 — Commerce Engine, Cart Engine. Same reasoning as above,
// applied to the new `cart/` and `analytics/` slices: every file here is
// genuinely client-only (a `localStorage`-backed store, a `fetch`-based
// beacon, and the React components/hooks built on them) and never
// imports anything from `gateway/*.ts`.
export * from './cart/types.js';
export * from './cart/useCart.js';
export * from './cart/CartDrawerProvider.js';
export * from './cart/CartDrawer.js';
export * from './cart/AddToCartButton.js';
export * from './cart/CartLineItemRow.js';
export * from './cart/CartSummary.js';
export * from './cart/PromoCodePlaceholder.js';
export * from './analytics/trackEvent.js';

// Beta Sprint 3 — Commerce Engine, Checkout Engine. Same reasoning —
// genuinely client-only, no `gateway/*.ts` import anywhere in this slice.
export * from './checkout/types.js';
export * from './checkout/PaymentMethodSelector.js';
export * from './checkout/CheckoutForm.js';

// Beta Sprint 3 — Commerce Engine, Order Success Experience.
// `order/types.js` itself is exported from the main barrel (`index.ts`)
// instead — pure interfaces, no client-only code, and `OrderConfirmation
// Summary` (also main-barrel, a Server Component) needs it too.
export * from './order/GuestOrderLookupForm.js';
