import { describe, expect, it, vi } from 'vitest';
import { resolvePrimitiveComponent, resolveSections } from '../src/engine/renderSections.js';
import { defaultPrimitiveRegistry } from '../src/engine/primitiveRegistry.js';
import { Hero } from '../src/primitives/Hero.js';
import type { Section, ThemePackage } from '../src/theme/types.js';

describe('engine/renderSections', () => {
  it('resolvePrimitiveComponent falls back to the real default when no theme is configured (THEME_ENGINE_ARCHITECTURE.md §3 step 4)', () => {
    expect(resolvePrimitiveComponent('Hero', null)).toBe(defaultPrimitiveRegistry.Hero?.component);
  });

  it('resolvePrimitiveComponent prefers a theme override over the default when one is configured', () => {
    function CustomHero() {
      return null;
    }
    const theme: ThemePackage = { id: 'custom', components: { Hero: CustomHero }, templates: {} };
    expect(resolvePrimitiveComponent('Hero', theme)).toBe(CustomHero);
  });

  it('resolvePrimitiveComponent returns undefined for a primitive name with no implementation anywhere (never throws)', () => {
    expect(resolvePrimitiveComponent('FAQ', null)).toBeUndefined();
  });

  it('resolveSections skips a Section whose primitive has no implementation, rather than crashing the whole page', () => {
    const sections: Section[] = [
      { type: 'Hero', configuration: {}, key: 'hero' },
      { type: 'FAQ', configuration: {}, key: 'faq' }, // no default implementation exists yet this milestone
    ];
    const resolved = resolveSections({ sections });
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.key).toBe('hero');
    expect(resolved[0]?.Component).toBe(Hero);
  });

  it('merges a Section’s own configuration with the calling page’s injected real data, data taking precedence', () => {
    const sections: Section[] = [{ type: 'Hero', configuration: { heading: 'from CMS' }, key: 'hero' }];
    const resolved = resolveSections({ sections, data: { hero: { heading: 'from real data', subheading: 'real' } } });
    expect(resolved[0]?.props).toEqual({ heading: 'from real data', subheading: 'real' });
  });

  it('generates a stable fallback key from the section index when no explicit key is supplied', () => {
    const sections: Section[] = [{ type: 'Hero', configuration: {} }];
    const resolved = resolveSections({ sections });
    expect(resolved[0]?.key).toBe('section-0');
  });

  it('resolveSections skips a Section whose configuration fails its primitive’s real Zod schema (Beta Milestone 2, §4.2), rather than throwing or rendering it wrong', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sections: Section[] = [
      { type: 'Hero', configuration: { heading: '' }, key: 'hero-invalid' }, // heading must be non-empty per heroConfigSchema
      { type: 'Hero', configuration: { heading: 'Real Sale' }, key: 'hero-valid' },
    ];
    const resolved = resolveSections({ sections });
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.key).toBe('hero-valid');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('hero-invalid'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('failed validation'));
    warnSpy.mockRestore();
  });

  it('resolveSections logs a structured warning (not a silent drop) when a Section has no registered implementation', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sections: Section[] = [{ type: 'FAQ', configuration: {}, key: 'faq' }];
    resolveSections({ sections });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('faq'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no theme or default implementation'));
    warnSpy.mockRestore();
  });

  it('a Hero Section with no configuration at all (permissive schema — every field optional) still resolves', () => {
    const sections: Section[] = [{ type: 'Hero', configuration: {}, key: 'hero' }];
    const resolved = resolveSections({ sections });
    expect(resolved).toHaveLength(1);
  });
});
