import type { ComponentType } from 'react';
import { z, type ZodTypeAny } from 'zod';
import { BrandSlider } from '../primitives/BrandSlider.js';
import { CategoryGrid } from '../primitives/CategoryGrid.js';
import { Hero } from '../primitives/Hero.js';
import { Newsletter } from '../primitives/Newsletter.js';
import { ProductCard } from '../primitives/ProductCard.js';
import { ProductGrid } from '../primitives/ProductGrid.js';
import { RichText } from '../primitives/RichText.js';
import { TrustBar } from '../primitives/TrustBar.js';
import type { StorefrontPrimitiveName } from '../theme/types.js';

/**
 * `THEME_ENGINE_ARCHITECTURE.md` §3 step 4's own default primitive
 * implementations, per `STOREFRONT_COMPONENT_ENGINE.md` §3 — "a real,
 * functional, deliberately plain implementation," not a placeholder. Every
 * other `StorefrontPrimitiveName` not registered here is a real, typed
 * contract member (`theme/types.ts`) with no implementation behind it
 * yet — `engine/renderSections.ts` skips an unresolved Section rather than
 * crashing, so this registry growing over time is additive, never a
 * breaking change to any page already composing a Section tree.
 *
 * **Beta Milestone 2 — implements `STOREFRONT_FOUNDATION_ARCHITECTURE_
 * REVIEW.md` §4.2's own recommendation**: each entry may carry a real Zod
 * `configSchema` that validates a Section's own merchant-authored
 * `configuration` object (never the page-injected `data` half of the
 * merge — that half is already TypeScript-checked at the call site by the
 * page itself, per `renderSections.ts`'s own docblock). No real CMS
 * content exists yet to be malformed, so schema coverage here is
 * deliberately partial — `Hero`'s is real and enforced, proving the
 * mechanism works end-to-end; every other primitive currently accepts any
 * `configuration` shape (`undefined` schema = not yet validated, a real,
 * honestly-scoped gap, not a silent one) until each is actually
 * merchant-configurable.
 */
export interface PrimitiveRegistryEntry {
  component: ComponentType<Record<string, unknown>>;
  configSchema?: ZodTypeAny;
}

const heroConfigSchema = z.object({
  heading: z.string().min(1).optional(),
  subheading: z.string().optional(),
  cta: z.object({ label: z.string().min(1), href: z.string().min(1) }).optional(),
});

const richTextConfigSchema = z.object({
  heading: z.string().min(1).max(180).optional(),
  body: z.string().min(1).max(50000),
});

function entry(component: ComponentType<never>, configSchema?: ZodTypeAny): PrimitiveRegistryEntry {
  return { component: component as unknown as ComponentType<Record<string, unknown>>, configSchema };
}

export const defaultPrimitiveRegistry: Partial<Record<StorefrontPrimitiveName, PrimitiveRegistryEntry>> = {
  Hero: entry(Hero, heroConfigSchema),
  RichText: entry(RichText, richTextConfigSchema),
  ProductGrid: entry(ProductGrid),
  CategoryGrid: entry(CategoryGrid),
  BrandSlider: entry(BrandSlider),
  ProductCard: entry(ProductCard),
  TrustBar: entry(TrustBar),
  Newsletter: entry(Newsletter),
};
