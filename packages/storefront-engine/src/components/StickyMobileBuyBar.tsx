import { AddToCartButton } from '../cart/AddToCartButton.js';
import { BuyNowButton } from '../cart/BuyNowButton.js';
import { PriceBlock, type Money } from './PriceBlock.js';
import { StockBadge } from './StockBadge.js';

export interface StickyMobileBuyBarProps {
  productId: string;
  name: string;
  href: string;
  imageSrc?: string | null;
  status: string;
  isAvailable: boolean | null;
  price?: Money | null;
  compareAtPrice?: Money | null;
}

export function StickyMobileBuyBar({
  productId,
  name,
  href,
  imageSrc,
  status,
  isAvailable,
  price,
  compareAtPrice,
}: StickyMobileBuyBarProps) {
  const unavailable = status !== 'active' || isAvailable === false;
  const unavailableReason = isAvailable === false ? 'Out of stock' : 'Unavailable';

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-surface p-3 shadow-elevation-3 lg:hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <StockBadge status={status} isAvailable={isAvailable} className="mb-0.5 w-fit" />
        <PriceBlock price={price} compareAtPrice={compareAtPrice} />
      </div>
      <AddToCartButton
        productId={productId}
        name={name}
        href={href}
        imageSrc={imageSrc}
        unitPrice={price ? price.amountMinor / 100 : null}
        currencyCode={price?.currencyCode ?? null}
        disabled={unavailable}
        disabledReason={unavailableReason}
        variant="icon"
        className="shrink-0"
      />
      <BuyNowButton
        productId={productId}
        name={name}
        href={href}
        imageSrc={imageSrc}
        unitPrice={price ? price.amountMinor / 100 : null}
        currencyCode={price?.currencyCode ?? null}
        disabled={unavailable}
        disabledReason={unavailableReason}
        className="shrink-0"
      />
    </div>
  );
}
