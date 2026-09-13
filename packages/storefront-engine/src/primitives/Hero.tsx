import Link from 'next/link';
import { Button, Text } from '@nexgen/ui';
import type { HeroProps } from './types.js';

/**
 * Merchant-driven homepage hero. The content remains entirely caller-owned;
 * this primitive only provides a stronger ecommerce visual hierarchy using
 * theme tokens, so every store inherits its own brand color without relying
 * on stock artwork, fake offers, or hard-coded merchant claims.
 */
export function Hero({ heading, subheading, cta }: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand/20 bg-brand/5 px-6 py-12 shadow-elevation-1 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden lg:block" aria-hidden="true">
        <div className="absolute right-[-4rem] top-[-5rem] h-72 w-72 rounded-full bg-brand/10" />
        <div className="absolute bottom-[-6rem] right-24 h-64 w-64 rounded-full border-[28px] border-brand/10" />
        <div className="absolute right-16 top-1/2 h-28 w-44 -translate-y-1/2 rotate-6 rounded-2xl border border-brand/20 bg-surface/80 shadow-elevation-2" />
        <div className="absolute right-44 top-[58%] h-20 w-32 -rotate-6 rounded-xl bg-brand/15" />
      </div>

      <div className="relative z-10 flex max-w-3xl flex-col items-start gap-5">
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
    </section>
  );
}
