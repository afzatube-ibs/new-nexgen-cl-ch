'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Dialog, DialogContent, Text } from '@nexgen/ui';
import { AddToCartButton } from '../cart/AddToCartButton.js';
import { PriceBlock, type Money } from './PriceBlock.js';
import { StockBadge } from './StockBadge.js';
import type { ProductSummary } from '../gateway/types.js';

export interface QuickViewModalProps {
  product: ProductSummary | null;
  href: string;
  brandName?: string | null;
  price?: Money | null;
  compareAtPrice?: Money | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickViewModal({ product, href, brandName, price, compareAtPrice, open, onOpenChange }: QuickViewModalProps) {
  const unavailable = product
    ? product.status !== 'active' || product.availability?.isAvailable === false
    : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" aria-describedby={undefined}>
        {product && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-subtle">
              {product.image ? (
                <Image src={product.image.src} alt={product.image.alt || product.name} fill sizes="(min-width: 640px) 25vw, 50vw" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-caption text-text-secondary">No image</div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {brandName && (
                <Text as="p" variant="caption" className="uppercase tracking-wide text-text-secondary">
                  {brandName}
                </Text>
              )}
              <Text as="h2" variant="heading">{product.name}</Text>
              <StockBadge
                status={product.status}
                isAvailable={product.availability?.isAvailable ?? null}
                className="w-fit"
              />
              <PriceBlock price={price} compareAtPrice={compareAtPrice} size="lg" />
              {product.shortDescription && (
                <Text as="p" variant="body" className="text-text-secondary">{product.shortDescription}</Text>
              )}
              <div className="mt-2 flex flex-col gap-2">
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
                />
                <Link
                  href={href}
                  className="text-center text-body text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-sm"
                >
                  View full details
                </Link>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
