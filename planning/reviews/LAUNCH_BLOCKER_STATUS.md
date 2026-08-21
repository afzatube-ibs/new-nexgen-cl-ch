# Launch Blocker Status

**As of:** Beta Milestone 2.6 completion.
**The only question this document answers:** *Can a merchant realistically launch on neXgen today?*

**Answer: No.**

This is not a criticism of the work done — Milestones 1 through 2.6 have built a genuinely solid, honest, professional Storefront foundation. It is a statement of fact about what is still missing, stated plainly because burying it would be a worse failure than the gap itself.

---

## Readiness by Area

### Pricing — 🔴 Blocking
No pricing route exists on the Store API Gateway (`apps/store-api-gateway/src/routes/catalog.ts` re-confirmed directly: `homepage`, `categories`, `brands`, `collections`, `products`, `search` — no `pricing`). `PriceBlock` renders its own honest "Price unavailable" on every real product, everywhere, on every page built so far. A shopper cannot see a price for a single real product today. `bdCurrency.ts` (Milestone 2.6) is ready the moment a route exists — this is a composition gap, not a presentation gap, but it is total: nothing sells without a visible price.

### Variants — 🔴 Blocking (for any product that needs them)
The real backend `Product` model supports `productType: simple | configurable | digital`, but no variant/SKU-switching route is exposed to the Storefront. `VariantSelector.tsx` (Milestone 2.6) is real and ready; there is nothing for it to select from yet. Any merchant selling apparel, footwear, or anything with color/size cannot represent their catalog correctly today.

### Trust — 🟡 Partial
`TrustBar`, `PolicyCard`, `PaymentMethodBadge`, `CourierBadge` all exist as real, reusable components. None is populated with real merchant-specific claims (no Store Settings/policy backend exists to source real return-window, real warranty terms, or real payment/courier integrations from) — every trust signal shown today is deliberately generic, non-committal copy, which is honest but not yet *convincing*. A merchant cannot yet say "we accept bKash" or "we ship via Pathao" through the Storefront, even if true in reality, because nothing on the Storefront asserts it.

### Reviews — 🔴 Blocking (for conversion, not for launch mechanically)
No Reviews or Q&A domain exists anywhere in `apps/backend/app/Domains`. `RatingSummary`/`ReviewList`/`QASection` are real, wired, and honestly empty on every product page. A brand-new store with zero reviews is normal; a platform with *no way to ever collect one* is not — this is a genuine product gap, not a rendering gap.

### Shipping — 🟡 Partial
Real Shipping/Fulfillment modules exist in `apps/admin` (Phase 2.8, frozen) with Zones/Methods/Rates/Shipments — but nothing composes that data from the Gateway to the public Storefront yet. `ShippingCalculator` (Milestone 2.6) is a real, honest, working form that correctly tells a shopper "not available yet" rather than fabricating a rate. `DeliveryEstimate`/`ShippingBadge`/`DeliveryPromise`/`ShippingTimeline` are ready the moment a Shipping-presentation route exists.

### Bangladesh Readiness — 🟡 Partial, architecture only
Real Division data (`bdDivisions.ts`), a real cascading `AddressSelector` (District/Upazila supplied by the caller, not fabricated — see `BETA_MILESTONE_2_6_COMMERCE_READINESS_REPORT.md` §1.5 for why), real BDT/lakh-crore formatting (`bdCurrency.ts`), and payment/courier label components for COD/bKash/Nagad/Rocket/SSLCommerz/PortPos/Pathao/Steadfast/RedX/Paperfly/Sundarban all exist as real, working UI architecture. **None is integrated with a real payment gateway or courier API** — per this milestone's own explicit instruction ("Do NOT fake integrations. Prepare architecture only."), none is presented to a shopper as available. A Bangladeshi merchant cannot accept a single real order through this Storefront today, by design, not by oversight.

### Merchant Readiness — 🔴 Blocking
There is no Cart and no Checkout. A shopper can browse, search, view a product, and read an honestly-empty review section — and then has nowhere to go. Every "Add to cart" button on every page, on every milestone so far, is a real, accessible, keyboard-focusable, honestly-labelled *inert* button (`aria-label="... — coming soon"`). This is the single largest, most direct blocker to launch, and it has been out of scope by explicit Product Owner instruction in every milestone through 2.6.

### Enterprise Readiness — 🟡 Partial
`generateStaticParams` is not implemented (every product/category/brand/collection page is server-rendered on demand, not statically generated — fine at current scale, a real bottleneck at 50,000+ SKUs). No CI pipeline runs these quality gates automatically. No bundle-size budget is enforced. No multi-currency, multi-language, or multi-warehouse presentation exists at the Storefront layer (the backend has real Inventory/Warehouse data — Phase 2.3-2.6 admin work — but it isn't surfaced to shoppers). Full detail in `MERCHANT_CONVERSION_AUDIT.md` Part 4.

---

## Every Remaining Blocker, Prioritized

### Must exist before any merchant can process a single real order
1. **Cart** — no cart of any kind exists (session-scoped or persistent). Every "Add to cart" affordance built across Milestones 1–2.6 is real UI with no cart behind it.
2. **Checkout** — no checkout flow, no address capture, no order placement.
3. **Pricing route on the Gateway** — without this, nothing in Cart/Checkout can even total correctly, and today no product shows a price at all.
4. **Payment integration** — at minimum COD (needs no external gateway) should be wireable first; bKash/Nagad/SSLCommerz require real merchant credentials and a real integration, not something this engagement can fabricate.

### Should exist before a merchant would consider the store "real" to shoppers
5. **A Reviews backend** — even a minimal one. Trust is the single largest lever `MERCHANT_CONVERSION_AUDIT.md` identifies for a new store with no brand recognition, and there is currently no way to ever populate it.
6. **Variant/SKU switching exposed to the Storefront** — blocks any merchant selling apparel, footwear, or multi-option products from representing their catalog at all.
7. **Real Shipping-rate composition to the Storefront** — `ShippingCalculator` is ready; it needs a real route to call.
8. **Store Settings-sourced trust content** — real return window, real warranty terms, real payment/courier methods actually enabled per merchant, rather than generic honest-but-noncommittal copy.

### Should exist before this is positioned as enterprise-grade
9. `generateStaticParams` for product/category/brand/collection pages.
10. CI running typecheck/lint/test/build/e2e automatically on every change.
11. A real multi-currency/multi-language presentation layer (backend localization groundwork exists in `Platform/Localization`; not yet surfaced to the Storefront).
12. Bundle-size budget and Core Web Vitals monitoring in CI.

Full detail, including the remaining ~85 items not repeated here, lives in `MERCHANT_CONVERSION_AUDIT.md`.

---

## What Is Genuinely Ready Today

It would be as dishonest to understate this as to overstate readiness elsewhere:
- Catalog browsing (Home, Category, Brand, Collection, Search, Product Detail) is professional-grade, responsive, accessible, and fast.
- Every trust/conversion/discovery component built across Milestones 2, 2.5, and 2.6 is real, typed, tested where the logic warrants it, and genuinely reusable — none is a mockup.
- The moment a Pricing route, a Cart, a Checkout, and a Reviews backend exist, the majority of the Storefront's presentation layer is a drop-in, not a rewrite — because every component in this milestone and the two before it was built against the real shape a future Gateway response would carry, never against an invented placeholder shape.
- Zero fabricated data exists anywhere in the Storefront today. Every empty state is honestly empty. Every inert button is honestly labelled. This is the foundation the next milestones build revenue on top of — not a UI to unwind and rebuild once real backends exist.

## Verdict

**No, a merchant cannot launch on neXgen today.** The blocking gap is Cart + Checkout + Pricing, full stop — everything else in this document is real but secondary to that. The Commerce Readiness Layer this milestone built is exactly what its name says: the layer *underneath* Cart/Checkout, now genuinely ready for the milestone that builds them.
