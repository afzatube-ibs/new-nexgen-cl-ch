import Link from 'next/link';
import Image from 'next/image';
import { Button, Text } from '@nexgen/ui';
import { PriceBlock } from '../components/PriceBlock.js';
import { StockBadge } from '../components/StockBadge.js';
import { toMoney } from '../pricing/toMoney.js';
import type { HeroProps } from './types.js';

/**
 * Merchant-driven homepage hero. The content remains entirely caller-owned;
 * this primitive only provides a stronger ecommerce visual hierarchy using
 * theme tokens, so every store inherits its own brand color without relying
 * on stock artwork, fake offers, or hard-coded merchant claims.
 */
export function Hero({ heading, subheading, cta, showFeaturedProduct = false, featuredProduct, featuredProductHref }: HeroProps) {
  const product = showFeaturedProduct ? featuredProduct : null;
  const productHref = product && featuredProductHref;
  const { price, compareAtPrice } = toMoney(product?.price);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand/20 bg-brand/5 shadow-elevation-1">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden lg:block" aria-hidden="true">
        <div className="absolute right-[-4rem] top-[-5rem] h-72 w-72 rounded-full bg-brand/10" />
        <div className="absolute bottom-[-6rem] right-24 h-64 w-64 rounded-full border-[28px] border-brand/10" />
        {!product && <div className="absolute right-16 top-1/2 h-28 w-44 -translate-y-1/2 rotate-6 rounded-2xl border border-brand/20 bg-surface/80 shadow-elevation-2" />}
        {!product && <div className="absolute right-44 top-[58%] h-20 w-32 -rotate-6 rounded-xl bg-brand/15" />}
      </div>

      <div className={`relative z-10 grid ${productHref ? 'lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]' : ''}`}>
        <div className="flex flex-col items-start gap-5 px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <span className="h-1 w-12 rounded-full bg-brand" aria-hidden="true" />
          <Text as="h1" variant="display" className="max-w-3xl text-balance">
            {heading}
          </Text>
          {subheading && (
            <Text variant="body" className="max-w-2xl text-text-secondary sm:text-lg">
              {subheading}
            </Text>
          )}
          {cta && (
            <Button asChild size="lg" className="mt-2 shadow-elevation-1">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          )}
        </div>

        {product && productHref && (
          <Link href={productHref} className="group relative min-h-80 overflow-hidden border-t border-brand/10 bg-surface lg:min-h-full lg:border-l lg:border-t-0" aria-label={`View ${product.name} details`}>
            {product.image ? (
              <Image src={product.image.src} alt={product.image.alt || product.name} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover transition-transform duration-slow group-hover:scale-[1.03]" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand/5 to-brand/15 px-8 pb-28 text-center text-body text-text-secondary">
                Product image coming soon
              </div>
            )}
            <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/50 bg-white/90 p-4 shadow-elevation-2 backdrop-blur sm:inset-x-6 sm:bottom-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Text as="p" variant="caption" className="mb-1 uppercase tracking-wide text-text-secondary">Featured product</Text>
                  <Text as="p" variant="body-strong" className="line-clamp-2 text-text-primary">{product.name}</Text>
                </div>
                <StockBadge status={product.status} isAvailable={product.availability?.isAvailable ?? null} />
              </div>
              <PriceBlock price={price} compareAtPrice={compareAtPrice} className="mt-2" />
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
