import type { ComponentType } from 'react';
import { defaultPrimitiveRegistry, type PrimitiveRegistryEntry } from './primitiveRegistry.js';
import type { Section, StorefrontPrimitiveName, ThemePackage } from '../theme/types.js';

/**
 * The Storefront Engine itself (`THEME_ENGINE_ARCHITECTURE.md` §2.2): walks
 * a page's own Section tree and, for each Section, resolves its `type` to a
 * real component — the active theme's own override first, this package's
 * own default second (§3 step 4's "always renders something" guarantee) —
 * then renders it. This module renders **no visual output of its own**; it
 * is purely tree-walking and component resolution, exactly as that
 * document's own §2.2 specifies.
 *
 * "No Theme fetches data. Theme receives data only" (this milestone's own
 * required build item 7) is enforced by construction here: `sectionData`
 * is a plain, already-resolved prop map the CALLING PAGE builds (a Server
 * Component that already knows, from its own route/archetype, which
 * Gateway calls to make) — this engine never imports `gateway/client.ts`,
 * never calls `fetch`, and has no way to. A Section's own `configuration`
 * (merchant-authored, once a real CMS exists) and `sectionData` (fetched,
 * real product/category/brand data) are merged into one props object and
 * handed to the resolved component — the component only ever *receives*.
 */

export type SectionDataMap = Partial<Record<string, Record<string, unknown>>>;

/**
 * A Section dropped from the resolved tree, and why — Beta Milestone 2
 * implements `STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md` §1.1's own
 * recommendation ("emit a structured, sampled log... every time a Section
 * is dropped") in place of the prior silent `if (!Component) return;`. No
 * real logging/metrics pipeline exists yet for this package (it is a pure
 * `.ts` library, framework-agnostic, with no logger dependency of its
 * own) — `console.warn` is the honest, real, zero-dependency version of
 * "structured and visible" that ships today; swapping it for a real sink
 * (Sentry, a structured logger) is a drop-in replacement of this one
 * function, not a design change, when that infrastructure exists.
 */
export interface DroppedSection {
  key: string;
  type: StorefrontPrimitiveName;
  reason: 'no-implementation' | 'invalid-configuration';
  /** Present only when `reason === 'invalid-configuration'` — the Zod issues, for a real, actionable warning rather than a bare "something was wrong." */
  issues?: string[];
}

function logSectionDropped(dropped: DroppedSection): void {
  if (dropped.reason === 'no-implementation') {
    console.warn(`[storefront-engine] Section "${dropped.key}" (type: ${dropped.type}) dropped — no theme or default implementation registered for this primitive.`);
    return;
  }
  console.warn(`[storefront-engine] Section "${dropped.key}" (type: ${dropped.type}) dropped — its configuration failed validation: ${dropped.issues?.join('; ')}`);
}

function resolvePrimitiveEntry(name: StorefrontPrimitiveName, theme?: ThemePackage | null): PrimitiveRegistryEntry | undefined {
  const themeOverride = theme?.components[name];
  // A theme's own override is a bare component (`theme/types.ts`'s own
  // `ThemePackage.components` contract predates this milestone's registry
  // entry shape and is out of scope to change here) — it therefore carries
  // no `configSchema` of its own, a real, documented gap: a theme-overridden
  // Section's `configuration` is never validated, only a default primitive's
  // is. Worth closing in a future milestone once themes are real; not
  // silently hidden here.
  if (themeOverride) return { component: themeOverride as ComponentType<Record<string, unknown>> };
  return defaultPrimitiveRegistry[name];
}

export function resolvePrimitiveComponent(name: StorefrontPrimitiveName, theme?: ThemePackage | null): ComponentType<Record<string, unknown>> | undefined {
  return resolvePrimitiveEntry(name, theme)?.component;
}

export interface RenderSectionsOptions {
  sections: Section[];
  theme?: ThemePackage | null;
  data?: SectionDataMap;
}

export interface ResolvedSection {
  key: string;
  Component: ComponentType<Record<string, unknown>>;
  props: Record<string, unknown>;
}

/**
 * Resolves every Section in the tree to a renderable `{ Component, props }`
 * pair, dropping (and logging, per `DroppedSection` above) any Section
 * whose `type` has no registered implementation (theme or default), OR
 * whose own `configuration` fails that primitive's real Zod `configSchema`
 * (Beta Milestone 2, `STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md` §4.2) —
 * `THEME_ENGINE_ARCHITECTURE.md` §3 step 4's "always renders something"
 * guarantee applied at the individual Section level: one Section this
 * platform hasn't built a primitive for yet, or one a future CMS editor
 * lets a merchant misconfigure, must never fail an entire page.
 *
 * Validation is deliberately scoped to `section.configuration` only — the
 * merchant/CMS-authored half of the eventual props merge — and never to
 * `sectionData` (the `data` parameter below), which is already
 * TypeScript-typed and supplied directly by the calling Server Component,
 * not by untrusted merchant input.
 *
 * Returns plain data (not JSX) deliberately — this keeps the Engine itself
 * usable from a `.ts` file with no JSX runtime concerns, and lets the
 * calling Server Component do the actual `<Component {...props} />`
 * rendering (a thin, one-line map) with full control over React `key`s and
 * `<Suspense>` boundaries per `STORE_FRONTEND_ARCHITECTURE.md` §2's own
 * streaming requirement — a concern this Engine deliberately leaves to the
 * page, not itself.
 */
export function resolveSections({ sections, theme, data }: RenderSectionsOptions): ResolvedSection[] {
  const resolved: ResolvedSection[] = [];
  sections.forEach((section, index) => {
    const key = section.key ?? `section-${index}`;
    const entry = resolvePrimitiveEntry(section.type, theme);
    if (!entry) {
      logSectionDropped({ key, type: section.type, reason: 'no-implementation' });
      return;
    }

    if (entry.configSchema) {
      const result = entry.configSchema.safeParse(section.configuration ?? {});
      if (!result.success) {
        logSectionDropped({
          key,
          type: section.type,
          reason: 'invalid-configuration',
          issues: result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
        });
        return;
      }
    }

    const sectionData = (section.key && data?.[section.key]) ?? {};
    resolved.push({ key, Component: entry.component, props: { ...section.configuration, ...sectionData } });
  });
  return resolved;
}
