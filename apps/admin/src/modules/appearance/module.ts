import { lazy } from 'react';
import { Palette } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';

/**
 * Beta Experience Pack 1 — Appearance, registered as its own first-class
 * top-level workspace (`registerModule()`, the identical mechanism every
 * other workspace already uses) — explicitly NOT a panel nested inside
 * `settings/module.ts`'s own `settingsPanels`, per the Product Owner's
 * own instruction and `APPEARANCE_WORKSPACE_SPECIFICATION.md` §1.3's own
 * "the literal, mechanical answer" to that requirement.
 *
 * This Pack builds exactly one real screen — Branding. The specification's
 * own full navigation tree (Theme Studio, Menus, Theme Library, Custom
 * Code, Version History) is deliberately not stubbed here with disabled
 * placeholder links — per this whole engagement's "no fake UI" discipline,
 * a nav entry only exists once a real screen exists behind it. Those
 * arrive in later Experience Packs (`APPEARANCE_WORKSPACE_SPECIFICATION.md`
 * §14, Packs 2–6).
 */
registerModule({
  id: 'appearance',
  navigation: [{ id: 'appearance', label: 'Appearance', icon: Palette, path: '/appearance/branding', permissions: ['appearance.branding.view'] }],
  routes: [
    {
      path: 'appearance/branding',
      element: lazy(() => import('./BrandingPage.js').then((m) => ({ default: m.BrandingPage }))),
      breadcrumb: 'Branding',
      permissions: ['appearance.branding.view'],
    },
  ],
});
