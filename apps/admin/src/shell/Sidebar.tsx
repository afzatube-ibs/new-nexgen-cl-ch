import { useMemo } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn, Drawer, DrawerContent, DrawerTitle } from '@nexgen/ui';
import { SidebarNav } from './SidebarNav.js';
import { useShellUiStore } from './uiStore.js';
import { useAuth } from '../auth/useAuth.js';
import { getNavigationTree } from '../registry/moduleRegistry.js';

/**
 * ADMIN_SHELL_ARCHITECTURE.md §4: full sidebar (240px) at `lg`+, icon-only
 * rail (64px) between `md` and `lg`, off-canvas Drawer below `md`. The
 * manual collapse toggle is independent of that breakpoint behavior.
 */
export function Sidebar() {
  const { permissions } = useAuth();
  const sidebarCollapsed = useShellUiStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useShellUiStore((s) => s.toggleSidebarCollapsed);
  const mobileNavOpen = useShellUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useShellUiStore((s) => s.setMobileNavOpen);

  // Recomputed only when the operator's permission set actually changes —
  // the registry itself is a static, module-load-time structure, so
  // there's no reason to re-walk and re-filter it on every unrelated
  // re-render (sidebar collapse toggle, mobile drawer open/close, ...).
  const items = useMemo(() => getNavigationTree(permissions), [permissions]);

  return (
    <>
      {/* Desktop: rail below `lg`, full above it, unless manually collapsed. */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-border bg-surface py-4 md:flex',
          sidebarCollapsed ? 'md:w-16' : 'md:w-16 lg:w-60',
        )}
      >
        <div className="flex-1 overflow-y-auto">
          <SidebarNav items={items} railOnly={sidebarCollapsed} />
        </div>
        <div className={cn('hidden px-2 lg:block', sidebarCollapsed && 'lg:hidden')}>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-caption text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
          >
            <PanelLeftClose className="size-4" />
            Collapse
          </button>
        </div>
        {sidebarCollapsed && (
          <div className="hidden px-2 lg:block">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              aria-label="Expand sidebar"
              className="flex w-full items-center justify-center rounded-md px-3 py-2 text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile: off-canvas Drawer, triggered by Header's hamburger. */}
      <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DrawerContent anchor="left" width="sm" className="md:hidden">
          <DrawerTitle className="sr-only">Navigation</DrawerTitle>
          <SidebarNav items={items} onNavigate={() => setMobileNavOpen(false)} />
        </DrawerContent>
      </Drawer>
    </>
  );
}
