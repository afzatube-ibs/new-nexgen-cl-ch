import Link from 'next/link';
import { Text } from '@nexgen/ui';
import type { CategorySummary } from '../gateway/types.js';

/**
 * Store Components library — the site-wide footer, this milestone's own
 * Homepage "Footer" build item. Links **only to real routes that exist in
 * this milestone's own routing scope** (top-level categories) — no
 * About/Contact/Careers/Help links, since no such pages exist yet (a
 * CMS-authored page/company-info backend is out of this milestone's own
 * explicit scope: "DO NOT BUILD: CMS editor"). A footer with those
 * columns is real, expected merchant-facing scope — named as a gap in
 * `MISSING_ECOMMERCE_FEATURES_AUDIT.md` rather than faked here with dead
 * links.
 */
export interface StoreFooterProps {
  categories: CategorySummary[];
  categoryHref: (category: CategorySummary) => string;
  storeName?: string;
}

export function StoreFooter({ categories, categoryHref, storeName = 'neXgen Store' }: StoreFooterProps) {
  const topLevel = categories.filter((category) => category.parentId === null).sort((a, b) => a.position - b.position);

  return (
    <footer className="border-t border-border bg-surface-subtle">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
          <Text as="p" variant="body-strong">
            {storeName}
          </Text>
          <Text as="p" variant="caption" className="text-text-secondary">
            © {new Date().getFullYear()} {storeName}. All rights reserved.
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
      </div>
    </footer>
  );
}
