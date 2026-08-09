import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LoadingOverlay, Toaster, TooltipProvider } from '@nexgen/ui';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';
import { Breadcrumbs } from './Breadcrumbs.js';
import { CommandPalette } from './CommandPalette.js';

/**
 * ADMIN_SHELL_ARCHITECTURE.md §2: the permanent layout every authenticated
 * route renders inside. Owns Header/Sidebar/Breadcrumbs; the routed content
 * region is a plain `<Outlet />` — this component has no knowledge of which
 * module is currently rendering inside it.
 */
export function AdminShell() {
  const location = useLocation();

  return (
    // One TooltipProvider for the entire shell — every Tooltip consumer
    // (WorkspaceSwitcher/NotificationCenter in Header, the collapsed
    // Sidebar's own icon-rail labels, and any future module screen) shares
    // it. Found live, via this shell's own Playwright suite: scoping it
    // inside Sidebar alone left Header's Tooltip usages with no provider
    // ancestor at all, throwing "Tooltip must be used within
    // TooltipProvider" and taking down the entire authenticated app.
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen flex-col">
        <Header />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Breadcrumbs />
            {/* §6: route-level code splitting + a scoped loading state —
                the Header/Sidebar above never re-render or flash during a
                route change, since they sit outside this Suspense
                boundary. */}
            <main className="flex-1 overflow-y-auto p-6">
              <Suspense fallback={<LoadingOverlay label="Loading…" />}>
                {/* `key` on the pathname gives each route its own
                    cross-fade entrance (motion.duration.slow) — see
                    index.css's `.animate-in`/`.fade-in-0` utilities, which
                    already collapse to an instant, reduced-motion-safe
                    fade. */}
                <div key={location.pathname} className="animate-in fade-in-0 duration-slow">
                  <Outlet />
                </div>
              </Suspense>
            </main>
          </div>
        </div>
        <CommandPalette />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
