import { lazy } from 'react';
import { FileText } from 'lucide-react';
import { registerModule } from '../../registry/moduleRegistry.js';

registerModule({
  id: 'cms',
  navigation: [
    {
      id: 'content',
      label: 'Content',
      icon: FileText,
      path: '/content/pages',
      permissions: ['cms.pages.view'],
    },
  ],
  routes: [
    {
      path: 'content/pages',
      element: lazy(() => import('./CmsPagesPage.js').then((module) => ({ default: module.CmsPagesPage }))),
      breadcrumb: 'Pages',
      permissions: ['cms.pages.view'],
    },
  ],
});
