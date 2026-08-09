import { useState, type ReactNode } from 'react';
import { ArrowLeft, Copy, Archive, ArchiveRestore, Trash2, Eye, MoreHorizontal } from 'lucide-react';
import {
  Button,
  Badge,
  Text,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@nexgen/ui';
import { ConfirmDialog, RequirePermission } from '../../../../framework/index.js';

export interface StickyActionBarProps {
  title: string;
  subtitle?: string;
  statusBadge?: ReactNode;
  isNew: boolean;
  isDirty: boolean;
  canManage: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  showPublish: boolean;
  publishing: boolean;
  onPublish: () => void;
  isArchived: boolean;
  onArchive: () => void;
  onRestore: () => void;
  onDuplicate: () => void;
  onDelete: () => Promise<void>;
  productName: string;
}

/**
 * The redesign's single biggest structural change: an always-reachable
 * action surface (Shopify/BigCommerce/Medusa's convergent pattern — see
 * PHASE_2_2A_PRODUCT_EDITOR_UX_REPORT.md's research notes) instead of a
 * Save button a merchant has to scroll back up or down to find. Sticks to
 * the top of the page's own scroll container (`AdminShell`'s `<main>`),
 * never the Admin Shell's own Header — this component owns only its own
 * page content, per this phase's hard rule not to touch the Shell.
 *
 * "One primary action visible at a time" (Stripe's restraint principle):
 * Publish only appears for an existing draft product; Save is always the
 * single highest-emphasis button.
 */
export function StickyActionBar({
  title,
  subtitle,
  statusBadge,
  isNew,
  isDirty,
  canManage,
  saving,
  onSave,
  onCancel,
  showPublish,
  publishing,
  onPublish,
  isArchived,
  onArchive,
  onRestore,
  onDuplicate,
  onDelete,
  productName,
}: StickyActionBarProps) {
  // `ConfirmDialog`'s own `trigger` prop composes via Radix's `asChild`
  // (needs to attach a ref to whatever's passed in) — `DropdownMenuItem`
  // (packages/ui) isn't `forwardRef`-wrapped, so nesting `ConfirmDialog`
  // *inside* a `DropdownMenuItem` throws a real "function components
  // cannot be given refs" warning, found live via this redesign's own
  // Playwright console-error capture. This phase's hard rules forbid
  // touching the Design System, so the fix lives here instead: a plain
  // controlled `Dialog`, opened from the menu item's `onSelect` rather
  // than composed as its child.
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete(): Promise<void> {
    setDeleting(true);
    try {
      await onDelete();
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="flex min-w-0 items-center gap-3">
        {isDirty ? (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="sm" aria-label="Back to products (unsaved changes)">
                <ArrowLeft className="size-4" />
              </Button>
            }
            title="Discard unsaved changes?"
            description="You have unsaved changes on this product. Leaving now will lose them."
            confirmLabel="Discard changes"
            destructive
            onConfirm={onCancel}
          />
        ) : (
          <Button type="button" variant="ghost" size="sm" aria-label="Back to products" onClick={onCancel}>
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {/* The page's own `<h1>` — `PageHeader` (the Shared Framework
                component every other list/detail screen uses) renders one
                via `Text as="h1"`; this sticky bar replaces `PageHeader`
                for the editor specifically, so it must carry that same
                responsibility itself. Found via manual review, not axe
                (the default ruleset doesn't always flag a missing h1). */}
            <Text as="h1" variant="body-strong" className="truncate">
              {title}
            </Text>
            {statusBadge}
            {isDirty && (
              <Badge variant="warning" className="shrink-0">
                Unsaved changes
              </Badge>
            )}
          </div>
          {subtitle && (
            <Text variant="caption" className="truncate text-text-secondary">
              {subtitle}
            </Text>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button type="button" variant="outline" size="sm" disabled>
                <Eye className="size-4" />
                Preview
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Storefront preview will be available once the Storefront module exists.</TooltipContent>
        </Tooltip>

        {!isNew && (
          <RequirePermission anyOf={['catalog.products.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" aria-label="More actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onDuplicate}>
                  <Copy className="size-4" /> Duplicate
                </DropdownMenuItem>
                {isArchived ? (
                  <DropdownMenuItem onSelect={onRestore}>
                    <ArchiveRestore className="size-4" /> Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={onArchive}>
                    <Archive className="size-4" /> Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem destructive onSelect={() => setDeleteConfirmOpen(true)}>
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </RequirePermission>
        )}

        {showPublish && (
          <RequirePermission anyOf={['catalog.products.manage']} inline={null}>
            <Button type="button" variant="secondary" size="sm" onClick={onPublish} loading={publishing}>
              Publish
            </Button>
          </RequirePermission>
        )}

        <RequirePermission anyOf={['catalog.products.manage']} inline={null}>
          <Button type="button" size="sm" onClick={onSave} loading={saving} disabled={!canManage}>
            {isNew ? 'Create product' : 'Save'}
            <kbd className="ml-1.5 hidden rounded border border-white/30 px-1 text-[10px] font-normal opacity-80 sm:inline">
              {typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘S' : 'Ctrl+S'}
            </kbd>
          </Button>
        </RequirePermission>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete this product?</DialogTitle>
            <DialogDescription>{`"${productName}" will be permanently deleted. This cannot be undone.`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleConfirmDelete()} loading={deleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
