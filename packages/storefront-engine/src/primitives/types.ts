import type { LucideIcon } from 'lucide-react';
import type { BrandSummary, CategorySummary, ProductSummary } from '../gateway/types.js';
import type { Money } from '../components/PriceBlock.js';

/**
 * `STOREFRONT_COMPONENT_ENGINE.md` §2's own props contracts, narrowed to
 * this milestone's real data shapes (`gateway/types.ts`, a direct mirror
 * of the Gateway's own composed response) — every primitive here is
 * "data-in, markup-out" per that document's §1: it receives already-
 * fetched data as props, never fetches its own.
 */

export interface HeroProps {
  heading: string;
  subheading?: string;
  cta?: { label: string; href: string };
}

export interface ProductCardProps {
  product: ProductSummary;
  /** The composite `{id}-{slug}` href this card links to — built by the calling page via `routing/idSlug.ts`, never by the card itself (keeps this primitive framework/routing-agnostic, per `THEME_ENGINE_ARCHITECTURE.md` §4's "no Theme Package fetches or decides routing of its own"). */
  href: string;
  /** Resolved by the calling page from `product.brandId` — the Gateway returns only the id, never a nested brand name, per `ProductCard.tsx`'s own docblock. */
  brandName?: string | null;
  /** Real price data, when a caller has it — always `undefined` today (see `PriceBlock.tsx`'s own docblock on the missing Gateway pricing route). */
  price?: Money | null;
  compareAtPrice?: Money | null;
}

/** Optional heading fields shared by every Homepage/listing grid primitive — rendered via `SectionHeader` when `heading` is supplied, per this milestone's own "Featured Categories / Featured Products / Trending / ..." labeled-section requirement. Omitted entirely (no heading markup at all) when a page composes the primitive without one, e.g. a Category page's own already-bannered product grid. */
export interface SectionHeadingProps {
  heading?: string;
  description?: string;
  viewAllHref?: string;
}

export interface ProductGridProps extends SectionHeadingProps {
  products: ProductSummary[];
  /** Resolves each product's own detail href — injected by the calling page, same reasoning as `ProductCardProps.href`. */
  buildHref: (product: ProductSummary) => string;
  columns?: 2 | 3 | 4;
  emptyTitle?: string;
  emptyDescription?: string;
}

export interface CategoryGridProps extends SectionHeadingProps {
  categories: CategorySummary[];
  buildHref: (category: CategorySummary) => string;
  columns?: 2 | 3 | 4;
}

export interface BrandSliderProps extends SectionHeadingProps {
  brands: BrandSummary[];
  buildHref: (brand: BrandSummary) => string;
}

export interface TrustBarProps {
  items?: { icon: LucideIcon; label: string; description?: string }[];
}
