import Link from 'next/link';
import { Facebook, Instagram, Mail, MessageCircle, Phone, Youtube } from 'lucide-react';
import { Icon, Text } from '@nexgen/ui';
import type { CategorySummary, StorefrontBranding } from '../gateway/types.js';

/**
 * Site-wide merchant footer.
 *
 * Only renders customer-facing facts that come from real merchant data.
 * Payment gateways and courier integrations are intentionally omitted until
 * the Storefront receives an actual enabled/available configuration source;
 * platform capability alone is not a promise that a merchant offers it.
 */
export interface StoreFooterProps {
  categories: CategorySummary[];
  categoryHref: (category: CategorySummary) => string;
  branding: StorefrontBranding;
}

export function StoreFooter({ categories, categoryHref, branding }: StoreFooterProps) {
  const topLevel = categories.filter((category) => category.parentId === null).sort((a, b) => a.position - b.position);
  const social = branding.social;
  const hasSocial = social.facebookUrl || social.instagramUrl || social.youtubeUrl || social.messengerUrl;
  const whatsappHref = social.whatsappNumber ? `https://wa.me/${social.whatsappNumber.replace(/[^\d]/g, '')}` : null;

  return (
    <footer className="border-t border-border bg-surface-subtle">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
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
          <div className="flex flex-col gap-2 sm:justify-self-end sm:text-right">
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
      </div>
    </footer>
  );
}
