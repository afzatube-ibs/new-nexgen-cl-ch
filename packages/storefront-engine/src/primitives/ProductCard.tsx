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

/** Product grid card backed by real Catalog, Pricing and Inventory data. */
export function ProductCard({ product, href, brandName, price, compareAtPrice }: ProductCardProps) {
  const unavailable = product.status !== 'active' || product.availability?.isAvailable === false;

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface',
        'transition-all duration-fast hover:-translate-y-0.5 hover:shadow-elevation-2',
      )}
    >
      <Link
        href={href}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-t-xl"
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
            className="absolute left-2 top-2"
          />

          <AddToCartButton
            variant="bar"
            productId={product.id}
            sku={product.sku}
            name={product.name}
            href={href}
            imageSrc={product.image?.src ?? null}
            unitPrice={price ? price.amountMinor / 100 : null}
            currencyCode={price?.currencyCode ?? null}
            disabled={unavailable}
            disabledReason={product.availability?.isAvailable === false ? 'Out of stock' : 'Unavailable'}
            className={cn(
              'absolute inset-x-0 bottom-0 translate-y-full bg-brand py-2 text-center text-caption font-medium text-white',
              'transition-transform duration-fast group-hover:translate-y-0 group-focus-within:translate-y-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white',
              'disabled:cursor-not-allowed disabled:opacity-70',
            )}
          />
        </div>
      </Link>

      <ProductQuickActions
        product={product}
        href={href}
        brandName={brandName}
        price={price}
        compareAtPrice={compareAtPrice}
        className="pointer-events-none absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100"
      />

      <Link href={href} className="flex flex-1 flex-col gap-1.5 p-3 focus-visible:outline-none">
        {brandName && <p className="text-caption uppercase tracking-wide text-text-secondary">{brandName}</p>}
        <p className="line-clamp-2 text-body-strong text-text-primary">{product.name}</p>
        <PriceBlock price={price} compareAtPrice={compareAtPrice} className="mt-auto pt-1" />
        <CodAvailableBadge />
      </Link>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface" aria-hidden="true">
      <div className="aspect-square w-full animate-pulse bg-surface-subtle" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-16 animate-pulse rounded bg-surface-subtle" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-subtle" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-subtle" />
        <div className="h-5 w-20 animate-pulse rounded bg-surface-subtle" />
      </div>
    </div>
  );
}
