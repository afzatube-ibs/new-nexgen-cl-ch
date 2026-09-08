import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@nexgen/ui';
import { PriceBlock } from './PriceBlock.js';
import { StockBadge } from './StockBadge.js';
import type { ProductSummary } from '../gateway/types.js';
import type { Money } from './PriceBlock.js';

export interface ProductListRowProps {
  product: ProductSummary;
  href: string;
  brandName?: string | null;
  price?: Money | null;
  compareAtPrice?: Money | null;
}

export function ProductListRow({ product, href, brandName, price, compareAtPrice }: ProductListRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-4 rounded-lg border border-border bg-surface p-3',
        'transition-shadow duration-fast hover:shadow-elevation-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
      )}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-subtle">
        {product.image ? (
          <Image src={product.image.src} alt={product.image.alt || product.name} fill sizes="80px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-caption text-text-secondary">No image</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {brandName && <p className="text-caption uppercase tracking-wide text-text-secondary">{brandName}</p>}
        <p className="truncate text-body-strong text-text-primary">{product.name}</p>
        {product.shortDescription && <p className="line-clamp-1 text-caption text-text-secondary">{product.shortDescription}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StockBadge status={product.status} isAvailable={product.availability?.isAvailable ?? null} />
        <PriceBlock price={price} compareAtPrice={compareAtPrice} />
      </div>
    </Link>
  );
}
