import Link from 'next/link';
import { Button, Text } from '@nexgen/ui';
import type { HeroProps } from './types.js';

/**
 * `STOREFRONT_COMPONENT_ENGINE.md` §2's `Hero` primitive, §3's own default
 * ("genuinely plain... not a stock illustration or generic gradient" —
 * `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §1.2 bar item 2). Beta Milestone 1
 * has no CMS-authored image to render here yet (M2, a later milestone),
 * so this default deliberately omits an `image` prop entirely rather than
 * rendering a placeholder graphic — a plain, honest, token-styled banner,
 * not a fake-designed one.
 */
export function Hero({ heading, subheading, cta }: HeroProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-subtle px-6 py-12 sm:px-12">
      <Text as="h1" variant="display" className="max-w-2xl">
        {heading}
      </Text>
      {subheading && (
        <Text variant="body" className="max-w-xl text-text-secondary">
          {subheading}
        </Text>
      )}
      {cta && (
        <Button asChild size="lg" className="mt-2">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}
