import { lazy } from 'react';
import { registerModule } from '../../registry/moduleRegistry.js';
import type { SettingsPanelDefinition } from '../../registry/types.js';

/**
 * Production Completion Plan v2, Milestone 10 (Settings Framework
 * Population + Localization Admin) — this module's entire contribution is
 * two real `settingsPanels` (`registry/types.ts`'s own contract, unused by
 * any module until this milestone — `SettingsPage.tsx`'s own docblock
 * named this as the correct, honest state of a platform with no business
 * module populating it yet). No top-level nav entry, no top-level route:
 * both real screens here live inside the existing Settings page, exactly
 * matching the plan's own framing ("give Store Configuration and
 * Localization their own real settings panels").
 */
const settingsPanels: SettingsPanelDefinition[] = [
  {
    id: 'store-configuration',
    label: 'Store Configuration',
    permissions: ['store_configuration.stores.view'],
    component: lazy(() => import('./StoreConfigurationPanel.js').then((m) => ({ default: m.StoreConfigurationPanel }))),
  },
  {
    id: 'localization',
    label: 'Localization',
    permissions: ['localization.currencies.view', 'localization.locales.view'],
    component: lazy(() => import('./LocalizationPanel.js').then((m) => ({ default: m.LocalizationPanel }))),
  },
];

registerModule({ id: 'localization', settingsPanels });
