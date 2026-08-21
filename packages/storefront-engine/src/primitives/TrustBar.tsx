import { Truck, RotateCcw, ShieldCheck, Headset } from 'lucide-react';
import { TrustBadge } from '../components/TrustBadge.js';
import type { TrustBarProps } from './types.js';

/**
 * `STOREFRONT_COMPONENT_ENGINE.md` §2's `TrustBar` primitive — this
 * milestone's own Homepage "Trust Features" build item. The four default
 * items below are **generic ecommerce trust signals, not claims about
 * this specific store's own real policies** (no Store Settings/Shipping-
 * policy/Return-policy backend exists yet to source real per-store copy
 * from — `MISSING_ECOMMERCE_FEATURES_AUDIT.md` names this gap). A future
 * real policy backend replaces the `items` default with real, merchant-
 * configured values through this same prop, not a rewrite.
 */
const DEFAULT_ITEMS: NonNullable<TrustBarProps['items']> = [
  { icon: Truck, label: 'Fast delivery', description: 'Nationwide shipping across Bangladesh' },
  { icon: RotateCcw, label: 'Easy returns', description: 'Hassle-free return window' },
  { icon: ShieldCheck, label: 'Secure payments', description: 'Your payment details stay protected' },
  { icon: Headset, label: 'Dedicated support', description: "We're here if you need help" },
];

export function TrustBar({ items = DEFAULT_ITEMS }: TrustBarProps) {
  return (
    <div className="grid grid-cols-1 gap-6 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <TrustBadge key={item.label} icon={item.icon} label={item.label} description={item.description} />
      ))}
    </div>
  );
}
