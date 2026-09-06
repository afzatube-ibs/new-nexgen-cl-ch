import { lazy } from 'react';
import { FileText, Home } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';

registerModule({
  id: 'cms',
  navigation: [
    {
      id: 'homepage',
      label: 'Homepage',
      icon: Home,
      path: '/content/homepage',
      permissions: ['cms.pages.view'],
    },
    {
      id: 'content',
      label: 'Pages',
      icon: FileText,
      path: '/content/pages',
      permissions: ['cms.pages.view'],
    },
  ],
  routes: [
    {
      path: 'content/homepage',
      element: lazy(() => import('./CmsHomepagePage.js').then((module) => ({ default: module.CmsHomepagePage }))),
      breadcrumb: 'Homepage',
      permissions: ['cms.pages.view'],
    },
    {
      path: 'content/pages',
      element: lazy(() => import('./CmsPagesPage.js').then((module) => ({ default: module.CmsPagesPage }))),
      breadcrumb: 'Pages',
      permissions: ['cms.pages.view'],
    },
  ],
});
