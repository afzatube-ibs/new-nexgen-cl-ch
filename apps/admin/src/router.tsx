import { createBrowserRouter } from 'react-router-dom';
import './modules/index.js';
import { AdminShell } from './shell/AdminShell.js';
import { ProtectedRoute } from './auth/ProtectedRoute.js';
import { RequirePermission } from './auth/RequirePermission.js';
import { LoginPage } from './pages/LoginPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { getAllRoutes } from './registry/moduleRegistry.js';

/**
 * The router is built entirely from what `src/modules/index.ts` registered
 * — no module's route is named here. Only the shell's own permanent
 * concerns (the authenticated layout, login, 404) are hardcoded, exactly as
 * ADMIN_SHELL_ARCHITECTURE.md §2 scopes them ("unauthenticated routes...
 * render outside AdminShell entirely").
 */
export function createAppRouter() {
  const moduleRoutes = getAllRoutes();

  return createBrowserRouter([
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <AdminShell />
        </ProtectedRoute>
      ),
      children: moduleRoutes.map((route) => {
        const element = (
          <RequirePermission anyOf={route.permissions ?? []}>
            <route.element />
          </RequirePermission>
        );
        const handle = { breadcrumb: route.breadcrumb };
        return route.path === ''
          ? { index: true as const, handle, element }
          : { path: route.path, handle, element };
      }),
    },
    {
      path: '*',
      element: (
        <ProtectedRoute>
          <AdminShell />
        </ProtectedRoute>
      ),
      children: [{ path: '*', element: <NotFoundPage /> }],
    },
  ]);
}
