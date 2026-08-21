# Order Success Architecture

**Sprint:** Beta Sprint 3 — Production Commerce Engine, Phase E.
**Status:** Real components built where a live path exists or can exist without fabrication; everything else documented as precise architecture, per this phase's own honest-boundary discipline (`COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §7).

---

## 1. What Was Built

| Brief item | Status | Where |
|---|---|---|
| Success page | ✅ Real component, not wired to a live route | `order/OrderConfirmationSummary.tsx` |
| Order tracking entry / Guest lookup | ✅ Real, live, wired | `order/GuestOrderLookupForm.tsx`, `/orders/lookup` |
| Invoice placeholder | 📋 Documented — see §3 | — |
| Download invoice architecture | 📋 Documented — see §3 | — |
| Recommended products | 📋 Documented — see §4 | — |
| Referral | 📋 Documented — see §5 | — |
| Review request | 📋 Documented — see §6 | — |
| Facebook Conversion confirmation | ✅ Real infrastructure already exists; documented precisely — see §7 | — |
| Server-side event hook | ✅ Real infrastructure already exists; documented precisely — see §7 | — |

## 2. `OrderConfirmationSummary` — Real, Typed, Not Live

Built field-for-field against the real backend's own `Orders\Http\Resources\OrderResource` (`order/types.ts`, re-verified from source, not invented): order number, real line items, real addresses, real totals, real timeline events. A real Server Component — pure props in, markup out.

**Why it cannot be wired to a live route today, precisely**: two independent, compounding reasons, not one.
1. `CheckoutForm` (Phase C) cannot create a real `Order` — no guest-facing backend path exists (Category B).
2. Even if an `Order` existed, `Orders`' own API routes are staff-`auth:sanctum`-gated, identical to every other Commerce module re-verified in Phase A — there is no Storefront-reachable way to fetch one back to show a shopper, regardless of how it was created.

This is the same "build the real component, name the real reason it isn't live yet" pattern this engagement established with `VariantSelector` (Beta Milestone 2.6) — a real, ready drop-in, not a stub, not fabricated data standing in for a real order.

## 3. Invoice — Not Built, Precisely Why

No invoice or PDF-generation capability exists anywhere in the real backend (`apps/backend/app/Domains/Commerce/Orders` re-searched directly for any invoice-related file — none found). Building an "invoice download" button would have nothing real to call. The correct future architecture, named here rather than guessed at in code: an `OrderResource`-shaped payload is already a complete, real data source for a PDF invoice renderer (a genuinely small addition — Laravel has mature PDF-generation packages, and `OrderResource`'s existing fields are sufficient for a real invoice line-by-line) — but that generation belongs on the backend, in the Orders module, as a real new endpoint (`GET /orders/{order}/invoice`), not fabricated client-side from data the Storefront doesn't have.

## 4. Recommended Products — Real Infrastructure Exists, Genuinely Reusable

`getRecommendations()` (Gateway, real since Milestone 1) already supports a `related`/`recommended` slot composition, used throughout the Product Detail page. The Order Success page is architecturally the same consumer, once it exists: `getRecommendations({ slot: 'recommended', productId: <any purchased item>, limit: 8 })` is a drop-in call, not new engineering. Not called from anywhere in this phase because there is no live Order Success page yet to call it from (§2) — named here as the exact, already-real seam rather than left undiscovered.

## 5. Referral — No Backend Capability, Named as a Real Gap

No referral/affiliate module exists anywhere in the real backend (`apps/backend/app/Domains` — re-confirmed against the full domain list already catalogued in `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §1). This is not a Storefront gap to work around; it is a genuinely missing backend capability, out of this sprint's own declared scope (Commerce Engine, not Growth/Marketing). Recorded here so it is not silently lost — a real referral program needs, at minimum, a referral-code generation/attribution model and a reward mechanism, neither of which exists today.

## 6. Review Request — Real Infrastructure Exists, One Real Gap Remains

`RatingSummary`/`ReviewCard`/`ReviewList`/`QASection` (Beta Milestone 2.6) are real, working components already wired live on the Product Detail page with an honest empty state. A post-purchase "review request" flow is the same components, triggered from an Order Success context instead of a passive product-page visit — architecturally trivial once §2's blocker is resolved. **What remains genuinely missing, unchanged from Milestone 2.6's own finding**: no Reviews backend domain exists anywhere (`apps/backend/app/Domains` has no Reviews module) — a shopper could be *asked* to review, but there is still nowhere real to submit one. This is the same backend gap Milestone 2.6 already named, not a new one this phase discovered.

## 7. Facebook Conversion Confirmation / Server-Side Event Hook — Real Infrastructure, Precisely What's Missing

This is the one item in this phase where real, working infrastructure already exists, unused, waiting for exactly this trigger:

- The Gateway's own CDP event pipeline (`apps/store-api-gateway/src/destinations/`) already registers a `meta-capi` destination (`createStubDestination({ id: 'meta-capi', apiKey: env.META_CAPI_ACCESS_TOKEN })`) — real infrastructure, honestly stubbed pending real credentials (`META_CAPI_ACCESS_TOKEN`, currently empty in this installation's `.env`, confirmed in Phase D's own credential audit).
- The event schema registry (`events/schemas.ts`) already has `checkout_completed` registered with exactly the fields a Conversions API "Purchase" event needs: `sessionId`, `orderId`, `grandTotal`, `currency`.
- `analytics/trackEvent.ts` (Phase B) is the real, working client already capable of sending it — `trackEvent({ name: 'checkout_completed', properties: { sessionId, orderId, grandTotal, currency } })`.

**What's missing is exactly one thing**: a real call site. `CheckoutForm` never reaches a successful submission (§2's same root cause), so `checkout_completed` is never actually fired. The precise, named integration point for the day Checkout is wired end-to-end: `SubmitCheckoutAction`'s own real backend success (or the Gateway's own composition of it) is where `trackEvent({ name: 'checkout_completed', ... })` belongs — and, server-side, the real backend already publishes a `CheckoutCompleted` domain event (`Checkout\Events\CheckoutCompleted`, confirmed in Phase A) that a Meta CAPI server-side integration could subscribe to directly, which is generally the *more* reliable half of a real Conversions API setup (server-side events are not blocked by ad blockers or ITP the way a browser pixel is) — worth recording as the stronger of two real, already-possible integration paths, not just the client-side one.

## 8. Quality Gates

```
packages/storefront-engine:  tsc --noEmit            ✅ clean
packages/storefront-engine:  eslint --max-warnings=0  ✅ clean
packages/storefront-engine:  vitest run               ✅ 80 passed (78 prior + 2 new GuestOrderLookupForm tests)
apps/storefront:             tsc --noEmit             ✅ clean
apps/storefront:             eslint --max-warnings=0  ✅ clean
apps/storefront:             next build               ✅ clean — /orders/lookup prerenders statically
```

## 9. Next

Phase F (`MERCHANT_PRODUCTION_READINESS_AUDIT.md`) is a pure audit — no further code, walking the entire merchant journey against everything Phases A–E established.
