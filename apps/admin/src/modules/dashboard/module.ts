import { lazy } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';

/** The Admin Engine's own Dashboard, registered through the same framework a future Catalog/Orders module uses — proof the framework needs no special-casing for "built-in" vs. "business" modules. */
registerModule({
  id: 'dashboard',
  navigation: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' }],
  routes: [
    {
      path: '',
      element: lazy(() => import('./DashboardPage.js').then((m) => ({ default: m.DashboardPage }))),
      breadcrumb: 'Dashboard',
    },
  ],
});
