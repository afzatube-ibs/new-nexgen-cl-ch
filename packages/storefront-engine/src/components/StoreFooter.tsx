import Link from 'next/link';
import { Facebook, Instagram, Mail, MessageCircle, Phone, Youtube } from 'lucide-react';
import { Icon, Text } from '@nexgen/ui';
import type { CategorySummary, StorefrontBranding } from '../gateway/types.js';
import { PaymentMethodsRow, REAL_BACKEND_PAYMENT_METHODS } from './PaymentMethodBadge.js';
import { CourierBadge, type CourierId } from './CourierBadge.js';

/**
 * Store Components library — the site-wide footer.
 *
 * **Beta Experience Pack 1 — Footer v3**: real merchant branding
 * (`APPEARANCE_WORKSPACE_SPECIFICATION.md` §4) now drives store name,
 * real support email/phone/WhatsApp, and real social links — rendered
 * only when the merchant has actually configured them (never a dead,
 * empty-href social icon). Payment-method and courier trust rows reuse
 * the real, already-honest `PaymentMethodBadge`/`CourierBadge` components
 * (plain text labels, no fabricated logos — those components' own
 * docblocks explain why). **Policies** (Privacy/Terms/Shipping/Returns)
 * remain honestly absent — no CMS/policy-page backend exists yet
 * (`CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §15, out of this Pack's scope —
 * "DO NOT TOUCH: CMS").
 */
export interface StoreFooterProps {
  categories: CategorySummary[];
  categoryHref: (category: CategorySummary) => string;
  branding: StorefrontBranding;
}

const REAL_COURIERS: CourierId[] = ['pathao', 'steadfast', 'redx', 'paperfly', 'sundarban'];

export function StoreFooter({ categories, categoryHref, branding }: StoreFooterProps) {
  const topLevel = categories.filter((category) => category.parentId === null).sort((a, b) => a.position - b.position);
  const social = branding.social;
  const hasSocial = social.facebookUrl || social.instagramUrl || social.youtubeUrl || social.messengerUrl;
  const whatsappHref = social.whatsappNumber ? `https://wa.me/${social.whatsappNumber.replace(/[^\d]/g, '')}` : null;

  return (
    <footer className="border-t border-border bg-surface-subtle">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <Text as="p" variant="body-strong">
            {branding.storeName}
          </Text>
          {branding.supportEmail && (
            <a href={`mailto:${branding.supportEmail}`} className="flex items-center gap-1.5 text-caption text-text-secondary hover:text-text-primary">
              <Icon icon={Mail} size="inline" />
              {branding.supportEmail}
            </a>
          )}
          {branding.supportPhone && (
            <a href={`tel:${branding.supportPhone}`} className="flex items-center gap-1.5 text-caption text-text-secondary hover:text-text-primary">
              <Icon icon={Phone} size="inline" />
              {branding.supportPhone}
            </a>
          )}
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-caption text-text-secondary hover:text-text-primary">
              <Icon icon={MessageCircle} size="inline" />
              WhatsApp
            </a>
          )}
          {hasSocial && (
            <div className="mt-1 flex gap-3">
              {social.facebookUrl && (
                <a href={social.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-text-secondary hover:text-text-primary">
                  <Icon icon={Facebook} size="standalone" />
                </a>
              )}
              {social.instagramUrl && (
                <a href={social.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-text-secondary hover:text-text-primary">
                  <Icon icon={Instagram} size="standalone" />
                </a>
              )}
              {social.youtubeUrl && (
                <a href={social.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-text-secondary hover:text-text-primary">
                  <Icon icon={Youtube} size="standalone" />
                </a>
              )}
            </div>
          )}
          <Text as="p" variant="caption" className="mt-1 text-text-secondary">
            © {new Date().getFullYear()} {branding.storeName}. All rights reserved.
          </Text>
        </div>

        {topLevel.length > 0 && (
          <div className="flex flex-col gap-2">
            <Text as="p" variant="caption" className="font-medium uppercase tracking-wide text-text-secondary">
              Shop
            </Text>
            <ul className="flex flex-col gap-1.5">
              {topLevel.slice(0, 8).map((category) => (
                <li key={category.id}>
                  <Link href={categoryHref(category)} className="text-body text-text-secondary hover:text-text-primary hover:underline">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Text as="p" variant="caption" className="font-medium uppercase tracking-wide text-text-secondary">
            We accept
          </Text>
          <PaymentMethodsRow methods={REAL_BACKEND_PAYMENT_METHODS} />
        </div>

        <div className="flex flex-col gap-2">
          <Text as="p" variant="caption" className="font-medium uppercase tracking-wide text-text-secondary">
            Delivery partners
          </Text>
          <div className="flex flex-wrap gap-1.5">
            {REAL_COURIERS.map((courier) => (
              <CourierBadge key={courier} courier={courier} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
