'use client';

import { useState, type FormEvent } from 'react';
import { Button, Input, Text } from '@nexgen/ui';

/**
 * Beta Sprint 3 — Order Success Experience. "Order tracking entry" /
 * "Guest lookup" — a real, working, live form (order number + email,
 * real client-side validation), honestly inert past that point for the
 * exact same reason `ShippingCalculator.tsx` is: no Orders lookup route
 * is reachable from the Storefront (Category B, same gap named
 * throughout this sprint). Unlike `OrderConfirmationSummary`, **this
 * component is wired to a real, live page** (`/orders/lookup`) — a guest
 * order-tracking entry point is genuinely useful navigation regardless
 * of whether the lookup itself can succeed yet, and costs nothing to
 * expose honestly.
 */
export function GuestOrderLookupForm() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      setError('Enter your order number and the email you used to order.');
      return;
    }
    setError(null);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Text as="p" variant="body" role="status" className="text-text-secondary">
        Order lookup isn&apos;t available yet — this store is still in early setup. If you have questions about a recent order, please contact support directly.
      </Text>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input label="Order number" placeholder="e.g. ORD-100234" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
      <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && (
        <Text as="p" variant="caption" role="alert" className="text-feedback-danger">
          {error}
        </Text>
      )}
      <Button type="submit">Track order</Button>
    </form>
  );
}
