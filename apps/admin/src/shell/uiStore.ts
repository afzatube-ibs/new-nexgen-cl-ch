import { create } from 'zustand';

const SIDEBAR_STORAGE_KEY = 'nexgen-admin-sidebar-collapsed';

interface ShellUiState {
  /** Manual collapse to the icon-only rail on large screens — independent of the responsive breakpoint behavior (ADMIN_SHELL_ARCHITECTURE.md §4). Persisted. */
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  /** The off-canvas Drawer's own open state below `md` — transient, not persisted. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useShellUiStore = create<ShellUiState>((set, get) => ({
  sidebarCollapsed: typeof window !== 'undefined' && window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1',
  toggleSidebarCollapsed: () => {
    const next = !get().sidebarCollapsed;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
    set({ sidebarCollapsed: next });
  },
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
