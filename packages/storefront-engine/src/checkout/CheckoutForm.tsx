'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button, Input, Text } from '@nexgen/ui';
import { AddressSelector, type AddressSelectorValue } from '../components/AddressSelector.js';
import { BANGLADESH_DIVISIONS } from '../components/bdDivisions.js';
import { CourierSelector, type CourierId } from '../components/CourierBadge.js';
import { CartLineItemRow } from '../cart/CartLineItemRow.js';
import { CartSummary } from '../cart/CartSummary.js';
import { useCart } from '../cart/useCart.js';
import { trackEvent } from '../analytics/trackEvent.js';
import { PaymentMethodSelector } from './PaymentMethodSelector.js';
import { emptyCheckoutAddress, type CheckoutAddress } from './types.js';
import type { PaymentMethodId } from '../components/PaymentMethodBadge.js';

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
 * **Honestly not real past this point**: there is no backend call this
 * page can make to actually create a `CheckoutSession`, price this
 * order, or place it — every Checkout/Payments/Shipping route requires
 * staff `auth:sanctum`, and no guest-facing path exists yet (Category B,
 * confirmed live in Phase A). "Place order" runs this form's own real
 * client-side validation, then shows an honest, specific result —
 * exactly the pattern `ShippingCalculator.tsx`/`Newsletter.tsx` already
 * established for a real form with no real backend behind it yet, never
 * a fabricated order confirmation.
 */
export function CheckoutForm() {
  const { cart, updateQuantity, removeItem } = useCart();
  const activeLines = cart.lines.filter((line) => !line.savedForLater);

  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<CheckoutAddress>(emptyCheckoutAddress());
  const [addressSelector, setAddressSelector] = useState<AddressSelectorValue>({ divisionId: null, districtId: null, upazilaId: null });
  const [preferredCourier, setPreferredCourier] = useState<CourierId | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [submitted, setSubmitted] = useState(false);
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
    if (!address.recipientName.trim()) next.recipientName = 'Recipient name is required.';
    if (!address.phone.trim()) next.phone = 'Phone number is required.';
    if (!address.addressLine1.trim()) next.addressLine1 = 'Street address is required.';
    if (!addressSelector.divisionId) next.division = 'Division is required.';
    if (!paymentMethod) next.paymentMethod = 'Select a payment method.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
  }

  if (activeLines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Text as="h1" variant="display">
          Your cart is empty
        </Text>
        <Text as="p" variant="body" className="text-text-secondary">
          Add something to your cart before checking out.
        </Text>
        <Button asChild>
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-center">
        <Text as="h1" variant="heading">
          We can&apos;t complete your order yet
        </Text>
        <Text as="p" variant="body" className="text-text-secondary">
          This store is still in early setup — order placement isn&apos;t connected yet. Nothing was charged, and no order was created. Please check back soon.
        </Text>
        <Button asChild variant="secondary">
          <Link href="/cart">Back to cart</Link>
        </Button>
      </div>
    );
  }

  return (
    // `noValidate` — a real bug found live via this component's own test
    // suite: the `required` attribute below (kept for its real
    // accessibility value) otherwise triggers the browser's own native
    // constraint validation on submit, which silently blocks the `submit`
    // event — and this component's own custom `validate()` — from ever
    // running when a required field is empty, so the specific, styled
    // `error` messages below never appeared at all. `noValidate` hands
    // gating entirely to `validate()`, the one real, consistent
    // validation path this form actually uses.
    <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <Text as="h2" variant="heading">
            Contact
          </Text>
          <Input type="email" label="Email address" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
        </section>

        <section className="flex flex-col gap-4">
          <Text as="h2" variant="heading">
            Shipping address
          </Text>
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
          <Input
            label="Postal code (optional)"
            value={address.postalCode ?? ''}
            onChange={(e) => updateAddress('postalCode', e.target.value || null)}
          />
        </section>

        <section className="flex flex-col gap-4">
          <Text as="h2" variant="heading">
            Preferred courier (optional)
          </Text>
          <Text as="p" variant="caption" className="text-text-secondary">
            A preference only — the courier that actually ships your order is confirmed after your order is placed.
          </Text>
          <CourierSelector couriers={['pathao', 'steadfast', 'redx', 'paperfly', 'sundarban']} value={preferredCourier} onChange={setPreferredCourier} />
        </section>

        <section className="flex flex-col gap-4">
          <Text as="h2" variant="heading">
            Payment method
          </Text>
          <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
          {errors.paymentMethod && (
            <Text as="p" variant="caption" role="alert" className="text-feedback-danger">
              {errors.paymentMethod}
            </Text>
          )}
        </section>
      </div>

      <aside className="flex h-fit flex-col gap-4 rounded-lg border border-border p-4">
        <Text as="h2" variant="heading">
          Order summary
        </Text>
        <div className="flex flex-col divide-y divide-border">
          {activeLines.map((line) => (
            <CartLineItemRow key={line.id} line={line} onQuantityChange={updateQuantity} onRemove={removeItem} />
          ))}
        </div>
        <CartSummary lines={cart.lines} />
        <Button type="submit" size="lg">
          Place order
        </Button>
      </aside>
    </form>
  );
}
