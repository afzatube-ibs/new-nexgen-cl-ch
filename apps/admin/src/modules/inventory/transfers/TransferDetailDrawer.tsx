import { ArrowRight } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, Button, Text, Skeleton, ErrorState, useToast } from '@nexgen/ui';
import type { WarehouseDTO } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { TransferStatusBadge } from '../shared/TransferStatusBadge.js';
import { ProductAndSkuCell } from '../stockLevels/ProductAndSkuCell.js';
import { dayGroupLabel, shortTime } from '../shared/formatTimestamp.js';
import { inventoryErrorMessage } from '../shared/errors.js';
import { useStockTransfer, useCompleteStockTransfer, useCancelStockTransfer } from './queries.js';

export interface TransferDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fetched independently by id (`GET /stock-transfers/{id}`) rather than derived from the list's own currently-loaded/filtered page — a status or search filter active on the list must never make an already-open drawer go blank just because the row it was opened from no longer matches that filter after its own status changes (e.g. completing a transfer while "Pending" is the active status filter). */
  transferId: string | undefined;
  warehouseById: Map<string, WarehouseDTO>;
}

function warehouseLabel(warehouse: WarehouseDTO | undefined): string {
  return warehouse ? `${warehouse.name} (${warehouse.code})` : 'Unknown warehouse';
}

/**
 * Transfer Details — the answer to "where is stock moving from/to, what,
 * how much, and is action required" without leaving the Transfers list. A
 * Drawer opened from a row click, matching the exact pattern Warehouses/
 * Stock Levels/Reservations all already use in this module — no new route.
 * `commit`/actor data aside, this record carries no more fields than what's
 * shown here (see `StockTransferResource`, apps/backend) — "who
 * initiated/completed/cancelled this" is answered by Activity, the same
 * documented gap Slice 2 already established for Reservations.
 */
export function TransferDetailDrawer({ open, onOpenChange, transferId, warehouseById }: TransferDetailDrawerProps) {
  const { toast } = useToast();
  const { data: transfer, status, refetch } = useStockTransfer(open ? transferId : undefined);
  const completeMutation = useCompleteStockTransfer();
  const cancelMutation = useCancelStockTransfer();

  async function handleCancel(): Promise<void> {
    if (!transfer) return;
    try {
      await cancelMutation.mutateAsync(transfer.id);
      toast({ variant: 'success', title: 'Transfer cancelled', description: `The hold on ${transfer.sku} at the source has been released.` });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't cancel transfer", description: inventoryErrorMessage(error) });
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent width="md">
        <DrawerHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DrawerTitle>{transfer?.sku ?? 'Transfer'}</DrawerTitle>
            {transfer && <TransferStatusBadge status={transfer.status} />}
          </div>
          <DrawerDescription>{transfer ? `${transfer.quantity} unit${transfer.quantity === 1 ? '' : 's'}` : 'Transfer detail'}</DrawerDescription>
        </DrawerHeader>

        {status === 'pending' && (
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton shape="block" className="h-20 w-full" />
            <Skeleton shape="text" className="h-4 w-40" />
            <Skeleton shape="text" className="h-4 w-32" />
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4">
            <ErrorState onRetry={() => void refetch()} />
          </div>
        )}

        {status === 'success' && transfer && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Text variant="caption" className="text-text-secondary">
                    From
                  </Text>
                  <Text variant="body-strong" as="p">
                    {warehouseLabel(warehouseById.get(transfer.fromWarehouseId))}
                  </Text>
                </div>
                <ArrowRight className="size-5 shrink-0 text-text-secondary" aria-hidden="true" />
                <div className="min-w-0 flex-1 text-right">
                  <Text variant="caption" className="text-text-secondary">
                    To
                  </Text>
                  <Text variant="body-strong" as="p">
                    {warehouseLabel(warehouseById.get(transfer.toWarehouseId))}
                  </Text>
                </div>
              </div>
            </div>

            <div>
              <Text variant="caption" className="text-text-secondary">
                Product
              </Text>
              <div className="mt-1">
                <ProductAndSkuCell sku={transfer.sku} />
              </div>
            </div>

            <div className="flex gap-6">
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Quantity
                </Text>
                <Text variant="body-strong" as="p" className="tabular-nums">
                  {transfer.quantity}
                </Text>
              </div>
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Started
                </Text>
                <Text variant="body-strong" as="p">
                  {transfer.createdAt ? `${dayGroupLabel(transfer.createdAt)}, ${shortTime(transfer.createdAt)}` : '—'}
                </Text>
              </div>
              {transfer.status !== 'pending' && (
                <div>
                  <Text variant="caption" className="text-text-secondary">
                    {transfer.status === 'completed' ? 'Completed' : 'Cancelled'}
                  </Text>
                  <Text variant="body-strong" as="p">
                    {transfer.updatedAt ? `${dayGroupLabel(transfer.updatedAt)}, ${shortTime(transfer.updatedAt)}` : '—'}
                  </Text>
                </div>
              )}
            </div>
          </div>
        )}

        <DrawerFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {transfer && transfer.status === 'pending' && (
            <RequirePermission anyOf={['inventory.transfers.manage']} inline={null}>
              <Button type="button" variant="outline" loading={cancelMutation.isPending} onClick={() => void handleCancel()}>
                Cancel transfer
              </Button>
              <ConfirmDialog
                trigger={<Button type="button">Complete transfer</Button>}
                title="Complete this transfer?"
                description={`${transfer.quantity} unit${transfer.quantity === 1 ? '' : 's'} of ${transfer.sku} will move from ${warehouseLabel(warehouseById.get(transfer.fromWarehouseId))} into ${warehouseLabel(warehouseById.get(transfer.toWarehouseId))}'s on-hand stock. This can't be undone from here.`}
                confirmLabel="Complete transfer"
                onConfirm={async () => {
                  await completeMutation.mutateAsync(transfer.id);
                  toast({ variant: 'success', title: 'Transfer completed', description: `${transfer.quantity} unit${transfer.quantity === 1 ? '' : 's'} of ${transfer.sku} moved.` });
                }}
                getErrorMessage={inventoryErrorMessage}
              />
            </RequirePermission>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
