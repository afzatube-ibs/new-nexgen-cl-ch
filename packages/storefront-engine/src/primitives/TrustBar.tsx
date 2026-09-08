import { Truck, RotateCcw, ShieldCheck, Headset } from 'lucide-react';
import { TrustBadge } from '../components/TrustBadge.js';
import type { TrustBarProps } from './types.js';

/**
 * Generic Storefront guidance only. Defaults deliberately avoid promising
 * merchant-specific delivery coverage, return windows, payment providers,
 * or support SLAs because those facts are not published by a policy/settings
 * backend yet. A merchant-configured source can replace these items later.
 */
const DEFAULT_ITEMS: NonNullable<TrustBarProps['items']> = [
  { icon: Truck, label: 'Delivery options', description: 'Rates and availability are confirmed at checkout' },
  { icon: RotateCcw, label: 'Return information', description: 'Check the store policy or contact the store before ordering' },
  { icon: ShieldCheck, label: 'Payment options', description: 'Available methods are shown at checkout' },
  { icon: Headset, label: 'Store support', description: 'Use the store contact details when you need help' },
];

export function TrustBar({ items = DEFAULT_ITEMS }: TrustBarProps) {
  return (
    <div className="grid grid-cols-1 gap-6 rounded-xl border border-border bg-surface p-8 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <TrustBadge key={item.label} icon={item.icon} label={item.label} description={item.description} />
      ))}
    </div>
  );
}
