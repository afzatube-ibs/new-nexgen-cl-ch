'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, MapPin, Truck as TruckIcon, Wallet, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Icon, Input, Text } from '@nexgen/ui';
import { AddressSelector, type AddressSelectorValue } from '../components/AddressSelector.js';
import { BANGLADESH_DIVISIONS } from '../components/bdDivisions.js';
import { CourierSelector, type CourierId } from '../components/CourierBadge.js';
import { CartLineItemRow } from '../cart/CartLineItemRow.js';
import { CartSummary } from '../cart/CartSummary.js';
import { useCart } from '../cart/useCart.js';
import { trackEvent } from '../analytics/trackEvent.js';
import { PaymentMethodSelector } from './PaymentMethodSelector.js';
import { emptyCheckoutAddress, type CheckoutAddress } from './types.js';
import { submitCheckout, CheckoutRequestError, LAST_ORDER_STORAGE_KEY, type SubmitCheckoutRequestBody } from './checkoutClient.js';
import { PaymentMethodsRow, REAL_BACKEND_PAYMENT_METHODS, type PaymentMethodId } from '../components/PaymentMethodBadge.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Beta Sprint 3 — Checkout Engine. As real as this Storefront can
 * honestly be today, built exactly to the boundary
 * `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §7/§8 names precisely:
 *
 * **Real**: every field, every selector, every validation rule matches
 * the real backend's own `CheckoutSession` contract (`checkout/types.ts`'s
 * own docblock) and reads the real cart (`useCart()`). `trackEvent({name:
 * 'checkout_started'})` fires once, on mount, against the real,
 * already-registered Gateway event — the same real analytics pipeline
 * `cartStore.ts` already uses.
 *
 * **Beta Sprint 5 — real past this point too.** `handleSubmit` now calls
 * the real, orchestrated `POST /v1/checkout/submit` on the Gateway
 * (`checkoutClient.js`), which composes the real backend's own 8-step
 * Checkout saga (Start → add items → addresses → shipping option →
 * review → submit → initiate payment) and returns a real `Order`. On a
 * real success, the result is handed to `/checkout/success` via
 * `sessionStorage` (see that page's own docblock for why not a
 * fetch-by-id route) and the cart is cleared. A real 422 from the
 * Gateway surfaces the real, field-level messages it returns; any other
 * failure (network, 503, an unsupported payment gateway with a
 * `paymentError` — see `checkoutClient.ts`'s own docblock) is shown
 * honestly, never silently retried or hidden.
 *
 * `city` has no dedicated input in `AddressSelector` (District/Upazila
 * are real but unwired here — no `districtsByDivision` data source is
 * supplied, `AddressSelector.tsx`'s own docblock names this as the
 * caller's responsibility), so a plain, honest "City" text field is
 * collected directly — the real backend's own `SetCheckoutAddressRequest`
 * requires a non-empty `city`, and leaving it unset would make every real
 * submission fail 422 regardless of how correct the rest of this form is.
 *
 * **UX refinement pass (Sprint 5, post-wiring)** — every section is now a
 * real `Card` with an icon-labeled title (the same `@nexgen/ui` pieces
 * every other polished Storefront/Admin screen already uses — `Alert`,
 * `Card`, `Icon` — not a bespoke look), the order summary is sticky on
 * desktop so it stays visible through a long form, and a real `Button
 * loading` spinner replaces the earlier manual "Placing order…" text
 * swap. Zero business logic, validation rule, or field changed — this is
 * a presentation-only pass over the exact form Sprint 5 already wired.
 *
 * **Experience Polish Sprint 1 — Checkout Experience Refinement** (a
 * presentation-only pass, no business rule, validation, payment flow,
 * shipping calculation, or order-submission logic touched):
 * - **Visual hierarchy via elevation, not decoration**: the four form
 *   Cards (Contact/Shipping/Courier/Payment) are now deliberately flat
 *   (`shadow-none`, `rounded-xl`) — calm, uniform, never competing for
 *   attention — while the Order Summary alone carries real elevation
 *   (`shadow-elevation-2`), reading as the one destination the eye should
 *   return to, per `NEXGEN_STOREFRONT_DESIGN_DNA.md` §4's "premium via
 *   restraint" and §15 rule #3 (exactly one dominant surface).
 * - **Order summary prominence + CTA emphasis**: "Place order" is now
 *   full-width (`className="w-full"`) inside its own now-more-prominent
 *   card — previously an inline-width button in the widest, most
 *   important card on the page.
 * - **Trust presentation**: a real `PaymentMethodsRow` (the exact same
 *   shared component and `REAL_BACKEND_PAYMENT_METHODS` data already used
 *   on the Product Detail page and `StoreFooter` — never a new or
 *   duplicated trust component) now sits beneath the "Secure checkout"
 *   line, reinforcing at the literal moment of decision that the payment
 *   method just chosen above is one of the platform's real, working
 *   gateways — not a new claim, the same real list rendered once more,
 *   exactly where it reassures most.
 * - **Spacing**: every Card's header/content padding increased (`p-5`)
 *   for more generous whitespace, and the page header gained more room
 *   to breathe (`gap-6` → `gap-8`) — `NEXGEN_STOREFRONT_DESIGN_DNA.md`
 *   §4's "whitespace does the persuading" applied to the platform's own
 *   highest-trust page.
 */
export function CheckoutForm() {
  const router = useRouter();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const activeLines = cart.lines.filter((line) => !line.savedForLater);

  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<CheckoutAddress>(emptyCheckoutAddress());
  const [addressSelector, setAddressSelector] = useState<AddressSelectorValue>({ divisionId: null, districtId: null, upazilaId: null });
  const [preferredCourier, setPreferredCourier] = useState<CourierId | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startedTracked, setStartedTracked] = useState(false);

  if (!startedTracked && activeLines.length > 0) {
    trackEvent({ name: 'checkout_started', properties: { sessionId: 'local' } });
    setStartedTracked(true);
  }

  function updateAddress<K extends keyof CheckoutAddress>(key: K, value: CheckoutAddress[K]) {
    setAddress((current) => ({ ...current, [key]: value }));
  }

  function handleAddressSelectorChange(next: AddressSelectorValue) {
    setAddressSelector(next);
    // Maps the real Division/District/Upazila selection down into the
    // real backend's own generic `region`/`city` fields — see `types.ts`'s
    // own docblock for why this mapping, not a richer contract, is honest.
    const divisionName = BANGLADESH_DIVISIONS.find((division) => division.id === next.divisionId)?.name ?? null;
    updateAddress('region', divisionName);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!address.recipientName.trim()) next.recipientName = 'Recipient name is required.';
    if (!address.phone.trim()) next.phone = 'Phone number is required.';
    if (!address.addressLine1.trim()) next.addressLine1 = 'Street address is required.';
    if (!address.city.trim()) next.city = 'City is required.';
    if (!addressSelector.divisionId) next.division = 'Division is required.';
    if (!paymentMethod) next.paymentMethod = 'Select a payment method.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    if (!validate() || !paymentMethod) return;

    setSubmitting(true);
    const body: SubmitCheckoutRequestBody = {
      email: email.trim(),
      // No separate "your name" field exists in this form — the guest's
      // own contact name is the recipient name they entered, an honest
      // reuse rather than an invented second field.
      name: address.recipientName.trim(),
      // Hardcoded, deliberately — not `DEFAULT_CURRENCY` (`storeContext.ts`,
      // `'USD'`), which governs general multi-currency browsing. This
      // form is already Bangladesh-only (`countryCode: 'BD'` below, a
      // BD-only Division/District/Upazila selector, BD couriers), and the
      // real backend's only provisioned `PriceList` today is BDT
      // (Beta Sprint 5's own provisioning) — submitting any other
      // currency would make the real backend's own price resolution fail
      // for every real product. Scoped to this form, not a platform-wide
      // change.
      currencyCode: 'BDT',
      address: {
        recipientName: address.recipientName.trim(),
        phone: address.phone.trim(),
        addressLine1: address.addressLine1.trim(),
        addressLine2: address.addressLine2,
        city: address.city.trim(),
        region: address.region,
        postalCode: address.postalCode,
        countryCode: address.countryCode,
      },
      // The real backend's own `ShippingOptionCatalog` — 'standard' is
      // real and always available (see `checkout/orchestrator.ts`'s own
      // docblock for why a real shipping-option SELECTOR isn't built this
      // pass: the Storefront never collected a preference beyond the
      // couriers above, which the real backend does not use for pricing).
      shippingOptionId: 'standard',
      paymentGatewayCode: paymentMethod,
      lines: activeLines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };

    try {
      const result = await submitCheckout(body);
      trackEvent({ name: 'checkout_completed', properties: { orderId: result.order.id, orderNumber: result.order.orderNumber } });
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(result));
      }
      clearCart();
      router.push('/checkout/success');
    } catch (error) {
      setSubmitting(false);
      if (error instanceof CheckoutRequestError && error.status === 422 && error.details) {
        const fieldErrors: Record<string, string> = {};
        for (const detail of error.details) {
          fieldErrors[detail.field] = detail.message;
        }
        setErrors((current) => ({ ...current, ...fieldErrors }));
        setSubmitError('Please fix the highlighted fields and try again.');
        return;
      }
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong placing your order. Please try again.');
    }
  }

  if (activeLines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle text-text-secondary">
          <ShoppingBag className="size-6" aria-hidden="true" />
        </span>
        <Text as="h1" variant="heading">
          Your cart is empty
        </Text>
        <Text as="p" variant="body" className="max-w-sm text-text-secondary">
          Add something to your cart before checking out.
        </Text>
        <Button asChild className="mt-2">
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <Text as="h1" variant="heading">
          Checkout
        </Text>
        <Text as="p" variant="body" className="text-text-secondary">
          {activeLines.length} {activeLines.length === 1 ? 'item' : 'items'} · Complete your details below to place your order.
        </Text>
      </div>

      {/*
        `noValidate` — a real bug found live via this component's own test
        suite: the `required` attribute below (kept for its real
        accessibility value) otherwise triggers the browser's own native
        constraint validation on submit, which silently blocks the `submit`
        event — and this component's own custom `validate()` — from ever
        running when a required field is empty, so the specific, styled
        `error` messages below never appeared at all. `noValidate` hands
        gating entirely to `validate()`, the one real, consistent
        validation path this form actually uses.
      */}
      <form onSubmit={handleSubmit} noValidate className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card className="rounded-xl shadow-none">
            <CardHeader className="flex-row items-center gap-2 p-5">
              <Icon icon={Mail} className="text-brand" />
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-5 pt-0">
              <Input type="email" label="Email address" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader className="flex-row items-center gap-2 p-5">
              <Icon icon={MapPin} className="text-brand" />
              <CardTitle>Shipping address</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-5 pt-0">
              <Input label="Recipient name" value={address.recipientName} onChange={(e) => updateAddress('recipientName', e.target.value)} error={errors.recipientName} required />
              <Input label="Phone" type="tel" value={address.phone} onChange={(e) => updateAddress('phone', e.target.value)} error={errors.phone} required />
              <Input
                label="Street address"
                value={address.addressLine1}
                onChange={(e) => updateAddress('addressLine1', e.target.value)}
                error={errors.addressLine1}
                required
              />
              <Input
                label="Apartment, floor, etc. (optional)"
                value={address.addressLine2 ?? ''}
                onChange={(e) => updateAddress('addressLine2', e.target.value || null)}
              />
              <AddressSelector value={addressSelector} onChange={handleAddressSelectorChange} />
              {errors.division && (
                <Text as="p" variant="caption" role="alert" className="text-feedback-danger">
                  {errors.division}
                </Text>
              )}
              {/* No real District data source is wired into AddressSelector above (see this component's own docblock) — a plain City field is the honest way to collect the one field the real backend actually requires. */}
              <Input label="City" value={address.city} onChange={(e) => updateAddress('city', e.target.value)} error={errors.city} required />
              <Input
                label="Postal code (optional)"
                value={address.postalCode ?? ''}
                onChange={(e) => updateAddress('postalCode', e.target.value || null)}
              />
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader className="flex-row items-center gap-2 p-5">
              <Icon icon={TruckIcon} className="text-brand" />
              <CardTitle>Preferred courier (optional)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-5 pt-0">
              <Text as="p" variant="caption" className="text-text-secondary">
                A preference only — the courier that actually ships your order is confirmed after your order is placed.
              </Text>
              <CourierSelector couriers={['pathao', 'steadfast', 'redx', 'paperfly', 'sundarban']} value={preferredCourier} onChange={setPreferredCourier} />
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader className="flex-row items-center gap-2 p-5">
              <Icon icon={Wallet} className="text-brand" />
              <CardTitle>Payment method</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-5 pt-0">
              <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
              {errors.paymentMethod && (
                <Text as="p" variant="caption" role="alert" className="text-feedback-danger">
                  {errors.paymentMethod}
                </Text>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl shadow-elevation-2 lg:sticky lg:top-6">
          <CardHeader className="p-5">
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-5 pt-0">
            <div className="flex flex-col divide-y divide-border">
              {activeLines.map((line) => (
                <CartLineItemRow key={line.id} line={line} onQuantityChange={updateQuantity} onRemove={removeItem} />
              ))}
            </div>
            <CartSummary lines={cart.lines} />
            {submitError && (
              <Alert variant="danger" role="alert">
                {submitError}
              </Alert>
            )}
            {/* Disabled while a real submission is in flight — prevents a double click from placing two real orders (the Gateway's own idempotency key protects a retried *identical* request, but a second click generates a NEW key by design, so this button, not the key, is what prevents a real duplicate order here). */}
            <Button type="submit" size="lg" loading={submitting} disabled={submitting} className="w-full">
              Place order
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-text-secondary">
              <Icon icon={ShieldCheck} size="inline" />
              <Text as="span" variant="caption">
                Secure checkout — your details are protected
              </Text>
            </div>
            <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
              <Text as="p" variant="caption" className="text-text-secondary">
                Accepted payment methods
              </Text>
              <PaymentMethodsRow methods={REAL_BACKEND_PAYMENT_METHODS} className="justify-center" />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
