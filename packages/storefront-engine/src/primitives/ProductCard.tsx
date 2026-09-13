import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@nexgen/ui';
import { AddToCartButton } from '../cart/AddToCartButton.js';
import { CodAvailableBadge } from '../components/CodAvailableBadge.js';
import { PriceBlock } from '../components/PriceBlock.js';
import { ProductBadgeSlot } from '../components/ProductBadgeSlot.js';
import { ProductQuickActions } from '../components/ProductQuickActions.js';
import { StockBadge } from '../components/StockBadge.js';
import type { ProductCardProps } from './types.js';

/**
 * Ecommerce product card built entirely from real Catalog, Pricing and
 * Inventory composition. Purchase intent stays visible on every viewport,
 * but known out-of-stock products never expose an enabled purchase action.
 */
export function ProductCard({ product, href, brandName, price, compareAtPrice }: ProductCardProps) {
  const unavailable = product.status !== 'active' || product.availability?.isAvailable === false;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-elevation-1',
        'transition-all duration-fast hover:-translate-y-0.5 hover:border-brand/20 hover:shadow-elevation-2',
      )}
    >
      <Link
        href={href}
        className="rounded-t-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        aria-label={product.name}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-surface-subtle">
          {product.image ? (
            <Image
              src={product.image.src}
              alt={product.image.alt || product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-slow group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-caption text-text-secondary">No image</div>
          )}
          <ProductBadgeSlot
            badges={[
              {
                id: 'stock',
                node: <StockBadge status={product.status} isAvailable={product.availability?.isAvailable ?? null} />,
              },
            ]}
            className="absolute left-3 top-3"
          />
        </div>
      </Link>

      <ProductQuickActions
        product={product}
        href={href}
        brandName={brandName}
        price={price}
        compareAtPrice={compareAtPrice}
        className="pointer-events-none absolute right-3 top-3 flex flex-col gap-1.5 opacity-0 transition-opacity duration-fast group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={href} className="flex flex-1 flex-col gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          {brandName && <p className="text-caption uppercase tracking-wide text-text-secondary">{brandName}</p>}
          <p className="line-clamp-2 min-h-10 text-body-strong text-text-primary transition-colors group-hover:text-brand">{product.name}</p>
          <PriceBlock price={price} compareAtPrice={compareAtPrice} className="mt-auto pt-1" />
          {product.availability?.isAvailable !== false && <CodAvailableBadge />}
        </Link>

        <AddToCartButton
          productId={product.id}
          sku={product.sku}
          name={product.name}
          href={href}
          imageSrc={product.image?.src ?? null}
          unitPrice={price ? price.amountMinor / 100 : null}
          currencyCode={price?.currencyCode ?? null}
          disabled={unavailable}
          disabledReason={product.availability?.isAvailable === false ? 'Out of stock' : 'Unavailable'}
          emphasis="primary"
          className="w-full"
        />
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-elevation-1" aria-hidden="true">
      <div className="aspect-square w-full animate-pulse bg-surface-subtle" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-surface-subtle" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-subtle" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-subtle" />
        <div className="h-5 w-20 animate-pulse rounded bg-surface-subtle" />
        <div className="h-10 w-full animate-pulse rounded-md bg-surface-subtle" />
      </div>
    </div>
  );
}
