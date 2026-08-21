import Link from 'next/link';
import { Icon, cn } from '@nexgen/ui';
import { ChevronRight } from 'lucide-react';

/**
 * Store Components library — real semantic breadcrumb nav (`<nav
 * aria-label="Breadcrumb">` + `<ol>`, last item `aria-current="page"`,
 * per WAI-ARIA APG breadcrumb pattern). Used on Category, Product Detail,
 * and Search pages — every trail here traces to a real page the visitor
 * can navigate to (Home, a real Category, a real Product), never a
 * fabricated hierarchy level.
 */
/** Distinct from `seo/jsonLd.ts`'s own `BreadcrumbItem` (that one is the JSON-LD `{name, url}` shape fed to `buildBreadcrumbSchema`) — this is the UI trail's own `{label, href?}` shape, the last item's `href` genuinely omitted since it is the current page. */
export interface BreadcrumbTrailItem {
  label: string;
  /** Omitted on the final (current-page) item. */
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbTrailItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('overflow-x-auto', className)}>
      <ol className="flex items-center gap-1.5 whitespace-nowrap text-caption text-text-secondary">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            // eslint-disable-next-line react/no-array-index-key -- a breadcrumb trail's own order IS its identity; two items can legitimately share a label (e.g. re-entering the same category name at a different depth), so the index is the only real, stable differentiator here.
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <Icon icon={ChevronRight} size="inline" className="shrink-0 text-text-secondary/60" />}
              {isLast || !item.href ? (
                <span aria-current={isLast ? 'page' : undefined} className={isLast ? 'font-medium text-text-primary' : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-sm hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
