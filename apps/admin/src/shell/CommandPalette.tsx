import { useEffect } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, Input } from '@nexgen/ui';
import { useShellUiStore } from './uiStore.js';

/**
 * Command Palette foundation (Phase 2.1 §3) — the keybinding, open/close
 * state, and dialog shell only. ADMIN_SHELL_ARCHITECTURE.md §9 explicitly
 * defers the actual results UI (a real, cross-module, keyboard-navigable
 * search) to later Phase 2.1+ work once a concrete results source is
 * wired — this component is the seam that work plugs into, not a
 * simulation of it.
 */
export function CommandPalette() {
  const open = useShellUiStore((s) => s.commandPaletteOpen);
  const setOpen = useShellUiStore((s) => s.setCommandPaletteOpen);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!open);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent size="lg" className="top-[20%] translate-y-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">Search across the platform</DialogDescription>
        {/* No explicit autoFocus: Radix's Dialog.Content already moves focus
            to its first focusable descendant on open (WCAG 2.4.3 focus
            order), so an explicit autoFocus prop here would be redundant
            with — and a jsx-a11y/no-autofocus violation on top of —
            behavior Radix already provides by construction. */}
        <Input
          placeholder="Search products, orders, customers… (coming soon)"
          disabled
          className="border-none text-body-strong shadow-none focus-visible:ring-0"
        />
        <p className="mt-3 flex items-center gap-2 text-caption text-text-secondary">
          <Search className="size-3.5" />
          Cross-module search activates as modules are built and register their own results.
        </p>
      </DialogContent>
    </Dialog>
  );
}
