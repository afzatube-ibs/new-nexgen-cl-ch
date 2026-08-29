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
export * from './cart/BuyNowButton.js';
export * from './cart/CartLineItemRow.js';
export * from './cart/CartSummary.js';
export * from './cart/PromoCodePlaceholder.js';
export * from './analytics/trackEvent.js';

// Beta Sprint 3 — Commerce Engine, Checkout Engine. Same reasoning —
// genuinely client-only, no `gateway/*.ts` import anywhere in this slice.
export * from './checkout/types.js';
export * from './checkout/PaymentMethodSelector.js';
export * from './checkout/CheckoutForm.js';

// Beta Sprint 5 — the real Guest Checkout network client. Self-contained
// (see its own docblock for why it never imports `gateway/*.ts`).
export * from './checkout/checkoutClient.js';

// Beta Sprint 3 — Commerce Engine, Order Success Experience.
// `order/types.js` itself is exported from the main barrel (`index.ts`)
// instead — pure interfaces, no client-only code, and `OrderConfirmation
// Summary` (also main-barrel, a Server Component) needs it too.
export * from './order/GuestOrderLookupForm.js';

// Production Completion Plan v2, Milestone 5 (Customer Accounts) — same
// reasoning as every export above: `authClient.ts` only ever calls this
// app's own same-origin `/api/auth/*` Route Handlers, never `gateway/
// *.ts` or `customerAuth.ts` (the real, server-only module those Route
// Handlers themselves call) — genuinely client-only, by the identical
// rule this file's own docblock established.
export * from './auth/authClient.js';
export * from './auth/LoginForm.js';
export * from './auth/RegisterForm.js';
export * from './auth/SignOutButton.js';
export * from './auth/ProfileEditForm.js';
export * from './auth/AddressBookManager.js';
export * from './auth/ForgotPasswordForm.js';
export * from './auth/ResetPasswordForm.js';

// Beta Sprint 5 — `order/types.js` and `OrderConfirmationSummary.js` are
// ALSO exported here (in addition to the main barrel above): the real
// `/checkout/success` page must read `sessionStorage` (browser-only), so
// the WHOLE page is a Client Component — and a Client Component can never
// import from the main barrel without pulling in `gateway/client.ts`'s
// own `import 'server-only'` transitively (the exact `next build` failure
// this file's own top docblock describes). Re-exporting the same,
// genuinely server-only-free modules from this client barrel too is safe
// (no duplicate runtime code — both barrels point at the same file) and
// is this codebase's own established fix for exactly this situation.
export * from './order/types.js';
export * from './order/OrderConfirmationSummary.js';
