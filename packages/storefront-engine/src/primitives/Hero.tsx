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
 *
 * **Experience Polish Sprint 1, Pack 1** — a presentation-only pass making
 * this the page's own strongest visual anchor, per
 * `NEXGEN_STOREFRONT_DESIGN_DNA.md` §4: a larger corner radius
 * (`rounded-xl`, matching Product Card v4/the PDP Buy Box/Checkout's own
 * corner language), more generous vertical breathing room
 * (`py-14 sm:py-24`, up from a flat `py-12`), and a touch more internal
 * rhythm between heading/subheading/CTA (`gap-4`, up from `gap-3`). Same
 * `heading`/`subheading`/`cta` contract, same real, honest content — no
 * new copy, no image, no gradient.
 */
export function Hero({ heading, subheading, cta }: HeroProps) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-surface-subtle px-6 py-14 sm:px-12 sm:py-24">
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
