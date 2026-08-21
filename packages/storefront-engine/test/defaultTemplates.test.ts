import { describe, expect, it } from 'vitest';
import { defaultTemplates, resolveTemplate } from '../src/theme/defaultTemplates.js';

describe('theme/defaultTemplates', () => {
  it('every real page archetype this milestone routes to has a non-empty default Section arrangement', () => {
    expect(defaultTemplates.homepage.defaultSections.length).toBeGreaterThan(0);
    expect(defaultTemplates['category-listing'].defaultSections.length).toBeGreaterThan(0);
    expect(defaultTemplates['brand-listing'].defaultSections.length).toBeGreaterThan(0);
    expect(defaultTemplates['collection-listing'].defaultSections.length).toBeGreaterThan(0);
    expect(defaultTemplates['product-detail'].defaultSections.length).toBeGreaterThan(0);
  });

  it('the blank archetype is always available and genuinely empty (THEME_ENGINE_ARCHITECTURE.md §6 fallback)', () => {
    expect(defaultTemplates.blank.defaultSections).toEqual([]);
  });

  it('resolveTemplate prefers a theme-supplied template over the built-in default', () => {
    const themeTemplates = { homepage: { archetype: 'homepage' as const, defaultSections: [{ type: 'Hero' as const, configuration: { custom: true } }] } };
    const resolved = resolveTemplate('homepage', themeTemplates);
    expect(resolved.defaultSections[0]?.configuration).toEqual({ custom: true });
  });

  it('resolveTemplate falls back to the built-in default when the theme supplies no template for that archetype', () => {
    const resolved = resolveTemplate('homepage', {});
    expect(resolved).toBe(defaultTemplates.homepage);
  });

  it('an archetype this milestone does not route to yet (search-results) still resolves to a real, empty Template rather than throwing', () => {
    const resolved = resolveTemplate('search-results');
    expect(resolved.defaultSections).toEqual([]);
  });
});
