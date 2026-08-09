import { lazy } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';

registerModule({
  id: 'settings',
  navigation: [{ id: 'settings', label: 'Settings', icon: SettingsIcon, path: '/settings' }],
  routes: [
    {
      path: 'settings',
      element: lazy(() => import('./SettingsPage.js').then((m) => ({ default: m.SettingsPage }))),
      breadcrumb: 'Settings',
    },
  ],
  // Deliberately no settingsPanels — see SettingsPage.tsx's own docblock.
});
