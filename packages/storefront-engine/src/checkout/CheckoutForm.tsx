'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, MapPin, Truck as TruckIcon, Wallet, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Icon, Input, Text } from '@nexgen/ui';
import { AddressSelector, type AddressSelectorValue } from '../components/AddressSelector.js';
import { BANGLADESH_DIVISIONS } from '../components/bdDivisions.js';
import { CartLineItemRow } from '../cart/CartLineItemRow.js';
import { CartSummary } from '../cart/CartSummary.js';
import { useCart } from '../cart/useCart.js';
import { trackEvent } from '../analytics/trackEvent.js';
import { PaymentMethodSelector } from './PaymentMethodSelector.js';
import { emptyCheckoutAddress, type CheckoutAddress } from './types.js';
import {
  submitCheckout,
  fetchPaymentMethods,
  fetchShippingOptions,
  CheckoutRequestError,
  LAST_ORDER_STORAGE_KEY,
  type CheckoutShippingOption,
  type SubmitCheckoutRequestBody,
} from './checkoutClient.js';
import { PAYMENT_METHOD_LABELS, PaymentMethodsRow, type PaymentMethodId } from '../components/PaymentMethodBadge.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPaymentMethodId(code: string): code is PaymentMethodId {
  return code in PAYMENT_METHOD_LABELS;
}

/**
 * Real Bangladesh-first guest checkout. Shipping and payment choices come
 * from the Gateway/backend at runtime: no rate, courier, or accepted-payment
 * claim is inferred from what the codebase merely knows how to integrate.
 */
export function CheckoutForm() {
  const router = useRouter();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const activeLines = cart.lines.filter((line) => !line.savedForLater);

  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<CheckoutAddress>(emptyCheckoutAddress());
  const [addressSelector, setAddressSelector] = useState<AddressSelectorValue>({ divisionId: null, districtId: null, upazilaId: null });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodId[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<CheckoutShippingOption[]>([]);
  const [shippingOptionId, setShippingOptionId] = useState<string | null>(null);
  const [shippingOptionsLoading, setShippingOptionsLoading] = useState(false);
  const [shippingOptionsError, setShippingOptionsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startedTracked, setStartedTracked] = useState(false);

  if (!startedTracked && activeLines.length > 0) {
    trackEvent({ name: 'checkout_started', properties: { sessionId: 'local' } });
    setStartedTracked(true);
  }

  useEffect(() => {
    let cancelled = false;
    setPaymentMethodsLoading(true);
    setPaymentMethodsError(null);

    fetchPaymentMethods()
      .then((methods) => {
        if (cancelled) return;
        const available = methods.map((method) => method.code).filter(isPaymentMethodId);
        setPaymentMethods(available);
        setPaymentMethod((current) => (current && available.includes(current) ? current : null));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPaymentMethods([]);
        setPaymentMethod(null);
        setPaymentMethodsError(error instanceof Error ? error.message : 'Could not load payment methods. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setPaymentMethodsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const linesKey = activeLines.map((line) => `${line.productId}:${line.quantity}`).join(',');

  useEffect(() => {
    if (!address.region || activeLines.length === 0) {
      setShippingOptions([]);
      setShippingOptionId(null);
      return;
    }

    let cancelled = false;
    setShippingOptionsLoading(true);
    setShippingOptionsError(null);

    fetchShippingOptions({
      countryCode: address.countryCode,
      region: address.region,
      lines: activeLines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
    })
      .then((options) => {
        if (cancelled) return;
        setShippingOptions(options);
        setShippingOptionId((current) => (current && options.some((option) => option.id === current) ? current : (options[0]?.id ?? null)));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setShippingOptions([]);
        setShippingOptionId(null);
        setShippingOptionsError(error instanceof Error ? error.message : 'Could not load shipping options. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setShippingOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- linesKey intentionally represents the active cart-line values.
  }, [address.region, address.countryCode, linesKey]);

  function updateAddress<K extends keyof CheckoutAddress>(key: K, value: CheckoutAddress[K]) {
    setAddress((current) => ({ ...current, [key]: value }));
  }

  function handleAddressSelectorChange(next: AddressSelectorValue) {
    setAddressSelector(next);
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
    if (!shippingOptionId) next.shippingOption = 'Select a shipping method.';
    if (!paymentMethod || !paymentMethods.includes(paymentMethod)) next.paymentMethod = 'Select an available payment method.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    if (!validate() || !paymentMethod || !paymentMethods.includes(paymentMethod) || !shippingOptionId) return;

    setSubmitting(true);
    const body: SubmitCheckoutRequestBody = {
      email: email.trim(),
      name: address.recipientName.trim(),
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
      shippingOptionId,
      paymentGatewayCode: paymentMethod,
      lines: activeLines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };

    try {
      const result = await submitCheckout(body);
      trackEvent({ name: 'checkout_completed', properties: { orderId: result.order.id, orderNumber: result.order.orderNumber } });
      if (typeof window !== 'undefined') window.sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(result));
      clearCart();
      router.push('/checkout/success');
    } catch (error) {
      setSubmitting(false);
      if (error instanceof CheckoutRequestError && error.status === 422 && error.details) {
        const fieldErrors: Record<string, string> = {};
        for (const detail of error.details) fieldErrors[detail.field] = detail.message;
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
        <Text as="h1" variant="heading">Your cart is empty</Text>
        <Text as="p" variant="body" className="max-w-sm text-text-secondary">Add something to your cart before checking out.</Text>
        <Button asChild className="mt-2"><Link href="/">Continue shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <Text as="h1" variant="heading">Checkout</Text>
        <Text as="p" variant="body" className="text-text-secondary">
          {activeLines.length} {activeLines.length === 1 ? 'item' : 'items'} · Complete your details below to place your order.
        </Text>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card className="rounded-xl shadow-none">
            <CardHeader className="flex-row items-center gap-2 p-5"><Icon icon={Mail} className="text-brand" /><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4 p-5 pt-0">
              <Input type="email" label="Email address" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader className="flex-row items-center gap-2 p-5"><Icon icon={MapPin} className="text-brand" /><CardTitle>Shipping address</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4 p-5 pt-0">
              <Input label="Recipient name" value={address.recipientName} onChange={(e) => updateAddress('recipientName', e.target.value)} error={errors.recipientName} required />
              <Input label="Phone" type="tel" value={address.phone} onChange={(e) => updateAddress('phone', e.target.value)} error={errors.phone} required />
              <Input label="Street address" value={address.addressLine1} onChange={(e) => updateAddress('addressLine1', e.target.value)} error={errors.addressLine1} required />
              <Input label="Apartment, floor, etc. (optional)" value={address.addressLine2 ?? ''} onChange={(e) => updateAddress('addressLine2', e.target.value || null)} />
              <AddressSelector value={addressSelector} onChange={handleAddressSelectorChange} />
              {errors.division && <Text as="p" variant="caption" role="alert" className="text-feedback-danger">{errors.division}</Text>}
              <Input label="City" value={address.city} onChange={(e) => updateAddress('city', e.target.value)} error={errors.city} required />
              <Input label="Postal code (optional)" value={address.postalCode ?? ''} onChange={(e) => updateAddress('postalCode', e.target.value || null)} />
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader className="flex-row items-center gap-2 p-5"><Icon icon={TruckIcon} className="text-brand" /><CardTitle>Shipping method</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 p-5 pt-0">
              {!address.region ? (
                <Text as="p" variant="caption" className="text-text-secondary">Select your division above to see real shipping options and rates.</Text>
              ) : shippingOptionsLoading ? (
                <Text as="p" variant="caption" className="text-text-secondary">Loading shipping options…</Text>
              ) : shippingOptionsError ? (
                <Alert variant="danger" role="alert">{shippingOptionsError}</Alert>
              ) : shippingOptions.length === 0 ? (
                <Text as="p" variant="caption" className="text-text-secondary">No shipping options are available for this address yet.</Text>
              ) : (
                <div role="radiogroup" aria-label="Shipping method" className="flex flex-col gap-2">
                  {shippingOptions.map((option) => (
                    <label key={option.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border p-3 has-[:checked]:border-brand has-[:checked]:bg-surface-subtle">
                      <span className="flex items-center gap-2">
                        <input type="radio" name="shippingOptionId" value={option.id} checked={shippingOptionId === option.id} onChange={() => setShippingOptionId(option.id)} />
                        <Text as="span" variant="body">{option.label}</Text>
                      </span>
                      <Text as="span" variant="body-strong">{option.amount} {option.currencyCode}</Text>
                    </label>
                  ))}
                </div>
              )}
              {errors.shippingOption && <Text as="p" variant="caption" role="alert" className="text-feedback-danger">{errors.shippingOption}</Text>}
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader className="flex-row items-center gap-2 p-5"><Icon icon={Wallet} className="text-brand" /><CardTitle>Payment method</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 p-5 pt-0">
              {paymentMethodsLoading ? (
                <Text as="p" variant="caption" className="text-text-secondary">Loading payment methods…</Text>
              ) : paymentMethodsError ? (
                <Alert variant="danger" role="alert">{paymentMethodsError}</Alert>
              ) : paymentMethods.length === 0 ? (
                <Alert variant="warning">No payment methods are available right now. Please contact the store before placing an order.</Alert>
              ) : (
                <PaymentMethodSelector methods={paymentMethods} value={paymentMethod} onChange={setPaymentMethod} />
              )}
              {errors.paymentMethod && <Text as="p" variant="caption" role="alert" className="text-feedback-danger">{errors.paymentMethod}</Text>}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl shadow-elevation-2 lg:sticky lg:top-6">
          <CardHeader className="p-5"><CardTitle>Order summary</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4 p-5 pt-0">
            <div className="flex flex-col divide-y divide-border">
              {activeLines.map((line) => <CartLineItemRow key={line.id} line={line} onQuantityChange={updateQuantity} onRemove={removeItem} />)}
            </div>
            <CartSummary lines={cart.lines} />
            {submitError && <Alert variant="danger" role="alert">{submitError}</Alert>}
            <Button
              type="submit"
              size="lg"
              loading={submitting}
              disabled={submitting || paymentMethodsLoading || paymentMethods.length === 0}
              className="w-full"
            >
              Place order
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-text-secondary">
              <Icon icon={ShieldCheck} size="inline" />
              <Text as="span" variant="caption">Secure checkout — your details are protected</Text>
            </div>
            {paymentMethods.length > 0 && (
              <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
                <Text as="p" variant="caption" className="text-text-secondary">Accepted payment methods</Text>
                <PaymentMethodsRow methods={paymentMethods} className="justify-center" />
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
