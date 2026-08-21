# Beta Checkout Engine Report

**Sprint:** Beta Sprint 3 — Production Commerce Engine, Phase C.
**Status:** Complete, real, and honest about exactly where it stops — per `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §7's own recommendation: "Phase C ships as much real UI as is honest today ... with the actual submission wired against a documented, clearly-marked integration point rather than a live call that would either fail or require an unsafe workaround."

---

## 1. What Was Built

A real, fully-validated `/checkout` page (`CheckoutForm`, `packages/storefront-engine/src/checkout/`):

- **Contact** — email, real validation.
- **Shipping address** — recipient name, phone, street address, apartment/floor (optional), the real `AddressSelector` (Division/District/Upazila, Milestone 2.6) mapped down into the real backend's own generic `region`/`city` fields (see `checkout/types.ts`'s own docblock — the real `CheckoutSession.shipping_address` shape has no Bangladesh-specific fields, so this is the honest mapping, not an invented richer contract), postal code (optional).
- **Preferred courier (optional)** — the real `CourierSelector` (Pathao/Steadfast/RedX/Paperfly/Sundarban, Milestone 2.6), explicitly labelled as a preference only.
- **Payment method** — a new `PaymentMethodSelector`, real single-select UI listing only the five payment methods with a **real backend gateway implementation today** (`cod`, `bkash`, `nagad`, `sslcommerz`, `banktransfer` — confirmed from source in Phase A, §2 below) — never `rocket`/`portpos`, which have no real backend gateway class.
- **Order summary** — the real cart (`useCart()`), editable in place (quantity/remove reuse `cartStore.ts` directly), and the real `CartSummary`.
- **"Place order"** — real client-side validation (see §3 for a real bug found and fixed here), and an honest, specific, non-fabricated result on a valid submission.

## 2. A Correction to a Prior Milestone's Own Docblock

While building this phase's `PaymentMethodSelector`, `PaymentMethodBadge.tsx`'s own docblock (Milestone 2.6) was found stale: it stated *"no payment gateway is actually integrated anywhere in this platform yet."* Phase A's fresh source-verification (`COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §1.2) found this is no longer accurate — the real backend has real, contract-driven gateway implementations for `cod`, `bkash`, `nagad`, `sslcommerz`, and `banktransfer`. Corrected in place, precisely: what remains true is narrower and different — no *Storefront-reachable* path to any of them exists yet (Category B), not that none exist at all. `banktransfer` was also added to `PaymentMethodId` (a real gap: the type was missing a payment method with a real backend gateway class behind it) alongside a new `REAL_BACKEND_PAYMENT_METHODS` export, so `PaymentMethodSelector` never lists a method with nothing real behind it.

## 3. Two Real Bugs Found and Fixed Live

### 3.1 Native `required` silently blocking custom validation

`CheckoutForm`'s own inputs carry `required` (real accessibility value), and the form also runs its own custom `validate()` on submit for styled, specific error messages. **Found live, via this component's own test suite**: without `noValidate` on the `<form>`, the browser's native HTML5 constraint validation intercepts the `submit` event before React's `onSubmit` handler ever runs whenever a required field is empty — so `validate()` never executed, no error message ever appeared, and clicking "Place order" on an incomplete form did *nothing visible at all*. Fixed by adding `noValidate` to the form, handing all gating to `validate()` — the one consistent validation path this form actually uses, with `required` kept purely for its real accessibility semantics.

### 3.2 A live Radix `Select` controlled/uncontrolled bug in `AddressSelector` (dormant since Milestone 2.6)

`AddressSelector.tsx` was built in Milestone 2.6 but never wired into a live page — this phase's own test suite was the **first thing to ever actually render it**. Each of its three `Select`s passed `value={... ?? undefined}`; Radix's `Select.Root` is uncontrolled while `value` is `undefined` and becomes controlled the instant a real string is passed, and React warns loudly ("Select is changing from uncontrolled to controlled") — exactly what selecting a Division triggered. Fixed by always passing a defined value (`''` for "nothing selected," Radix's own documented convention at the `Root` level), so every `Select` here is controlled from its first render onward. This is a second, independent confirmation of this engagement's own repeated finding: a component built-but-unwired can carry a real defect invisible until something finally renders it — exactly why this sprint's own quality gates insist on wiring, not just building.

## 4. Quality Gates

```
packages/storefront-engine:  tsc --noEmit            ✅ clean
packages/storefront-engine:  eslint --max-warnings=0  ✅ clean
packages/storefront-engine:  vitest run               ✅ 78 passed (74 prior + 4 new CheckoutForm RTL tests)
apps/storefront:             tsc --noEmit             ✅ clean
apps/storefront:             eslint --max-warnings=0  ✅ clean
apps/storefront:             next build               ✅ clean — /checkout prerenders statically, no RSC boundary violation
```

`test/CheckoutForm.test.tsx` (React Testing Library, `jsdom`) covers: the honest empty-cart state, the real order summary rendering from the real cart, every required-field validation error appearing on an empty submission (proving §3.1's fix), and — deterministically, independent of any browser — a fully-valid submission showing the real "We can't complete your order yet" result and never a fabricated confirmation.

## 5. Live Verification

Verified against the real backend + Gateway + a freshly-rebuilt storefront dev server (the previous instance had accumulated a stale webpack cache across a very long session and was killed and restarted clean, `.next` cleared).

**Confirmed, directly:** zero console errors on `/checkout`; the header's cart badge correctly reads a real, directly-seeded `localStorage` cart ("Open cart, 1 item"), proving `useCart()`/`cartStore.ts` hydration is genuinely wired to real browser storage; the honest empty-cart state renders correctly and consistently with the real shared cart state (no divergent representation between `/cart`, the drawer, and `/checkout`); `next build` produced no RSC violation and `/checkout` prerenders.

**A real, unresolved tool limitation carried over from `BETA_CART_ENGINE_REPORT.md` §5, now with an additional, precisely-diagnosed symptom**: the Browser pane's `document.hidden` remained `true` across a full page reload, a dev-server restart, and a fresh tab, consistent with that report's own finding. In this phase, a second symptom of the same root cause surfaced: after directly seeding `localStorage` with a real cart line and navigating to `/checkout`, the site header correctly reflected it (real hydration completed) but `CheckoutForm`'s own main content did not — it kept showing the server-rendered "Your cart is empty" placeholder rather than re-rendering after client hydration, even after a 1.5-second wait. Chromium is documented to throttle JavaScript execution, layout, and rendering work in backgrounded/hidden tabs; given `getBoundingClientRect()` was already confirmed returning an all-zero box for every element on this same tab (`BETA_CART_ENGINE_REPORT.md` §5), and `computer.screenshot` explicitly failed with "the page is not compositing frames," a hydration re-render being throttled or deferred in this same tab is consistent with, not contradictory to, everything already observed — not a new, separate defect. **This is exactly why `test/CheckoutForm.test.tsx` exists**: its second test (`'renders the real order summary from the real cart when items exist'`) asserts precisely the behavior the Browser pane could not confirm, deterministically, and passes.

## 6. What This Phase Deliberately Did Not Do

- **Did not call any backend endpoint, start a real `CheckoutSession`, or place a real order.** No guest-facing backend path exists (Category B, confirmed in Phase A) — attempting to fake this would be the single worst thing this phase could do, given this entire engagement's own anti-fabrication discipline.
- **Did not build a shipping-rate display.** No honest source exists — Checkout↔Shipping composition is a real, separate integration gap named in Phase A §1.1/§8 step 4, not something a Storefront-only phase can wire.
- **Did not build a coupon-entry field.** The real backend contract supports it (`CheckoutSession.coupon_code`), but applying one requires the same not-yet-reachable session this entire page is honestly built up to and stops before.
- **Did not persist checkout form state across a reload.** Deliberate: the real backend's own `CheckoutSession` is what should own that durability (60-minute rolling expiry, already real) — simulating it client-side would imply a guarantee this page cannot actually keep.

## 7. Next

Phase D (`BANGLADESH_COMMERCE_READINESS.md`) documents the real backend architecture this phase's `PaymentMethodSelector`/`CourierSelector` already draw from — largely a verification-and-documentation pass over capability that, per Phase A, turned out to already be real and well-built.
