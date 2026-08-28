// @nexgen/storefront-engine — public barrel. apps/storefront imports from
// '@nexgen/storefront-engine' only, never reaching into a file path directly.

export * from './theme/types.js';
export * from './theme/defaultTemplates.js';

export * from './engine/renderSections.js';
export * from './engine/primitiveRegistry.js';

export * from './gateway/types.js';
export * from './gateway/errors.js';
export * from './gateway/client.js';
export * from './gateway/catalog.js';
export * from './gateway/recommendations.js';

export * from './context/storeContext.js';

export * from './routing/idSlug.js';

export * from './seo/jsonLd.js';

export * from './primitives/types.js';
export * from './primitives/Hero.js';
export * from './primitives/ProductCard.js';
export * from './primitives/ProductGrid.js';
export * from './primitives/CategoryGrid.js';
export * from './primitives/BrandSlider.js';
export * from './primitives/TrustBar.js';
export * from './primitives/Newsletter.js';

// Beta Milestone 2 — Store Components library (CUSTOMER_EXPERIENCE_
// ARCHITECTURE.md's own "reusable, not duplicated per page" bar): lower-
// level building blocks composed BY primitives and pages, distinct from
// the Section-registry-bound primitives above.
export * from './components/SectionHeader.js';
export * from './components/Breadcrumb.js';
export * from './components/TrustBadge.js';
export * from './components/StockBadge.js';
export * from './components/PriceBlock.js';
export * from './pricing/toMoney.js';
export * from './components/ProductBadgeSlot.js';
export * from './components/Pagination.js';
export * from './components/CategoryBanner.js';
export * from './components/SortDropdown.js';
export * from './components/FilterSidebar.js';
export * from './components/FilterDrawer.js';
export * from './components/ProductToolbar.js';
export * from './components/ProductGallery.js';
export * from './components/StoreHeader.js';
export * from './components/StoreFooter.js';
export * from './components/ProductListRow.js';
export * from './components/SearchOverlay.js';
export * from './components/recentSearches.js';

// Beta Milestone 2.5 — Merchant Conversion Experience.
export * from './components/recentlyViewed.js';
export * from './components/RecentlyViewedRail.js';
export * from './components/QuickViewModal.js';
export * from './components/ProductQuickActions.js';
export * from './components/CountdownTimer.js';
export * from './components/BackToTop.js';
export * from './components/StickyMobileBuyBar.js';
export * from './components/PromotionBanner.js';

// Beta Milestone 2.6 — Commerce Readiness Layer.
export * from './components/VariantSelector.js';
export * from './components/RatingSummary.js';
export * from './components/ReviewCard.js';
export * from './components/ReviewFilters.js';
export * from './components/QASection.js';
export * from './components/PolicyCard.js';
export * from './components/PaymentMethodBadge.js';
export * from './components/CourierBadge.js';
export * from './components/CodAvailableBadge.js';
export * from './components/ShippingPresentation.js';
export * from './components/ShippingTimeline.js';
export * from './components/ShippingCalculator.js';
export * from './components/bdDivisions.js';
export * from './components/bdCurrency.js';
export * from './components/AddressSelector.js';

// Beta Sprint 3 — Commerce Engine, Order Success Experience.
export * from './order/types.js';
export * from './order/OrderConfirmationSummary.js';
