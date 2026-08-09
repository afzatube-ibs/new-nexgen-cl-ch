import { Menu, Search } from 'lucide-react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.js';
import { NotificationCenter } from './NotificationCenter.js';
import { ThemeToggle } from './ThemeToggle.js';
import { UserMenu } from './UserMenu.js';
import { useShellUiStore } from './uiStore.js';

/** ADMIN_SHELL_ARCHITECTURE.md §3: workspace switcher → global search → notification center → theme toggle → user menu. */
export function Header() {
  const setMobileNavOpen = useShellUiStore((s) => s.setMobileNavOpen);
  const setCommandPaletteOpen = useShellUiStore((s) => s.setCommandPaletteOpen);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 sm:gap-4">
      <div className="flex min-w-0 shrink items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle md:hidden"
        >
          <Menu className="size-5" />
        </button>
        <WorkspaceSwitcher />
      </div>

      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="hidden max-w-md flex-1 items-center gap-2 rounded-md border border-border bg-surface-subtle px-3 py-1.5 text-caption text-text-secondary hover:border-brand sm:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search"
          className="flex size-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle sm:hidden"
        >
          <Search className="size-5" />
        </button>
        <NotificationCenter />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
