'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, Icon, cn } from '@nexgen/ui';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import type { ResponsiveImage } from '../gateway/types.js';

/**
 * Store Components library — the Product Detail page's own image gallery:
 * a sticky main image, a keyboard-navigable thumbnail rail, a real
 * hover-zoom (CSS `scale`, not a fake magnifier overlay pretending to
 * read pixel data it doesn't have), and — Beta Milestone 2.5 — a real
 * fullscreen lightbox (`Maximize2` trigger, a Radix `Dialog` at
 * `size="fullscreen"`, the same primitive `SearchOverlay`/`QuickViewModal`
 * already use). `images` is `ProductDetail.images` (`gateway/types.ts`) —
 * real Gateway-composed URLs, never a placeholder graphic; when the list
 * is empty, an honest "No image available" panel renders instead of a
 * broken `<img>` or a stock photo. **360° view / product video** — no
 * such media field exists on `ProductDetail` yet; not rendered
 * (`MERCHANT_CONVERSION_AUDIT.md` names the real backend gap).
 *
 * **Experience Polish Sprint 1, Pack 5.5** — a real, presentation-only
 * polish pass: a larger corner radius and a resting elevation shadow on
 * the main image (product photography "on a pedestal," per
 * `NEXGEN_STOREFRONT_DESIGN_DNA.md` §1.1's Apple/Shopify reference —
 * whitespace and presentation do the persuading, not new copy), and a
 * matching radius bump on the thumbnail rail for one consistent corner
 * language across the whole redesigned PDP (`ProductCard` v4's own
 * `rounded-xl`, the new Buy Box card). No interaction, data, or zoom
 * behavior changed.
 */
export interface ProductGalleryProps {
  images: ResponsiveImage[];
  productName: string;
  className?: string;
}

export function ProductGallery({ images, productName, className }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const active = images[activeIndex];

  function selectByOffset(offset: number) {
    if (images.length === 0) return;
    setActiveIndex((current) => (current + offset + images.length) % images.length);
  }

  return (
    <div className={cn('flex flex-col gap-3 lg:sticky lg:top-6', className)}>
      <div className="group relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-surface-subtle shadow-elevation-1">
        {active ? (
          <>
            <Image
              key={active.src}
              src={active.src}
              alt={active.alt || productName}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-slow group-hover:scale-110"
            />
            <button
              type="button"
              aria-label="View fullscreen"
              onClick={() => setFullscreenOpen(true)}
              className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text-primary opacity-0 shadow-elevation-1 transition-opacity duration-fast hover:text-brand focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus group-hover:opacity-100"
            >
              <Icon icon={Maximize2} size="inline" />
            </button>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-caption text-text-secondary">No image available</div>
        )}
      </div>

      {images.length > 1 && (
        <div role="tablist" aria-label={`${productName} thumbnails`} className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`View image ${index + 1} of ${images.length}`}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') { event.preventDefault(); selectByOffset(1); }
                if (event.key === 'ArrowLeft') { event.preventDefault(); selectByOffset(-1); }
              }}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
                index === activeIndex ? 'border-brand' : 'border-transparent hover:border-border',
              )}
            >
              <Image src={image.src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {active && (
        <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
          <DialogContent size="fullscreen" className="flex items-center justify-center bg-surface p-4" aria-describedby={undefined}>
            <div className="relative h-full max-h-[85vh] w-full">
              <Image src={active.src} alt={active.alt || productName} fill sizes="100vw" className="object-contain" />
            </div>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() => selectByOffset(-1)}
                  className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-text-primary shadow-elevation-2 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <Icon icon={ChevronLeft} size="standalone" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => selectByOffset(1)}
                  className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-text-primary shadow-elevation-2 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <Icon icon={ChevronRight} size="standalone" />
                </button>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
