import Image from 'next/image';
import { Text } from '@nexgen/ui';
import type { ResponsiveImage } from '../gateway/types.js';

/**
 * Store Components library — the Category page's own header banner: real
 * category name/description, and a real image only when the Gateway
 * actually returned one (`CategorySummary.image` is honestly nullable —
 * most categories in this catalog have none yet, per Milestone 1's own
 * findings). No stock photo/gradient fallback is substituted for a missing
 * image — a plain token-styled heading block instead, same "genuinely
 * plain, not fake-designed" rule `Hero`'s own docblock already applies.
 */
export interface CategoryBannerProps {
  name: string;
  description?: string | null;
  image?: ResponsiveImage | null;
  productCount?: number;
}

export function CategoryBanner({ name, description, image, productCount }: CategoryBannerProps) {
  return (
    <div className="relative flex min-h-[160px] flex-col justify-end gap-2 overflow-hidden rounded-lg border border-border bg-surface-subtle px-6 py-8 sm:px-10">
      {image && (
        <Image src={image.src} alt="" fill sizes="100vw" className="object-cover opacity-25" priority />
      )}
      <div className="relative flex flex-col gap-2">
        <Text as="h1" variant="display">
          {name}
        </Text>
        {description && (
          <Text as="p" variant="body" className="max-w-2xl text-text-secondary">
            {description}
          </Text>
        )}
        {productCount !== undefined && (
          <Text as="p" variant="caption" className="text-text-secondary">
            {productCount} {productCount === 1 ? 'product' : 'products'}
          </Text>
        )}
      </div>
    </div>
  );
}
