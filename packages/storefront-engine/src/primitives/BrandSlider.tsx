import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@nexgen/ui';
import { SectionHeader } from '../components/SectionHeader.js';
import type { BrandSliderProps } from './types.js';

/**
 * `STOREFRONT_COMPONENT_ENGINE.md` §2's `BrandSlider` primitive — a
 * horizontally-scrolling list, no client-side carousel JavaScript (native
 * CSS scroll-snap is sufficient and ships zero extra bytes, matching
 * `PERFORMANCE_FOUNDATION.md`'s own "minimal JavaScript" bar). Renders
 * nothing at all when there are no brands, rather than an empty rail —
 * including its own `heading`, since an empty "Our Brands" section header
 * over nothing would be a real, if small, dishonest signal.
 */
export function BrandSlider({ brands, buildHref, heading, description, viewAllHref }: BrandSliderProps) {
  if (brands.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {heading && <SectionHeader heading={heading} description={description} viewAllHref={viewAllHref} />}
      <div className="flex snap-x gap-4 overflow-x-auto pb-2">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={buildHref(brand)}
            className={cn(
              'flex w-32 shrink-0 snap-start flex-col items-center gap-2 rounded-lg border border-border bg-surface p-3',
              'transition-shadow duration-fast hover:shadow-elevation-2',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            )}
          >
            <div className="relative flex h-12 w-full items-center justify-center">
              {brand.logo ? <Image src={brand.logo.src} alt={brand.logo.alt || brand.name} fill className="object-contain" sizes="128px" /> : <span className="text-body-strong text-text-secondary">{brand.name}</span>}
            </div>
            <p className="line-clamp-1 text-caption text-text-secondary">{brand.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
