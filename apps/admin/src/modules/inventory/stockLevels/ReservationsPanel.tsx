import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, History } from 'lucide-react';
import { Button, Text, Skeleton, EmptyState, ErrorState, Pagination, useToast } from '@nexgen/ui';
import type { StockItemDTO, StockReservationDTO } from '@nexgen/api-client';
import { useAuth } from '../../../auth/useAuth.js';
import { ReservationStatusBadge } from '../shared/ReservationStatusBadge.js';
import { reservationReferenceLabel } from '../shared/reservationLabel.js';
import { dayGroupLabel, shortTime } from '../shared/formatTimestamp.js';
import { inventoryErrorMessage } from '../shared/errors.js';
import { useStockItemReservations, useReleaseReservation } from './queries.js';
import { PlaceHoldDialog } from './PlaceHoldDialog.js';

export interface ReservationsPanelProps {
  stockItem: StockItemDTO;
}

/**
 * "Which stock is reserved, why, and is action required" — the operational
 * view of this StockItem's real, current reservations (`GET /stock-items/
 * {id}/reservations`). Who reserved/released it and when is answered by
 * Activity instead (the reservation record itself carries no actor field —
 * see `reservationLabel.ts`'s own docblock), matching the same current-
 * state-vs-history split already established between Stock Levels and
 * Activity in Slice 1. UX refinement pass: each row now points there
 * explicitly (permission-gated on the same `inventory.audit_log.view` the
 * Activity route itself requires) rather than leaving "who" as a silent gap.
 *
 * Found during the Inventory Freeze audit: reservation mutations
 * (`POST .../reservations`, `POST .../release`) are gated server-side on
 * `inventory.reservations.manage`, a distinct permission from
 * `inventory.stock.manage` (which only covers Adjust Stock). This panel
 * used to trust a `canManage` prop threaded down from `StockLevelsPage`'s
 * own `inventory.stock.manage` check — meaning a user with stock-manage but
 * not reservations-manage saw a "Reserve stock"/"Release" button that would
 * 403 on click, and a user with reservations-manage but not stock-manage
 * never saw those controls at all despite having real permission to use
 * them. This panel now derives its own permission directly, the same way
 * `canViewActivity` already does below.
 */
export function ReservationsPanel({ stockItem }: ReservationsPanelProps) {
  const { can } = useAuth();
  const canManage = can('inventory.reservations.manage');
  const canViewActivity = can('inventory.audit_log.view');
  const [page, setPage] = useState(1);
  const { data, status, refetch } = useStockItemReservations(stockItem.id, page);
  const releaseMutation = useReleaseReservation(stockItem.id);
  const { toast } = useToast();
  const [reserveOpen, setReserveOpen] = useState(false);

  async function handleRelease(reservation: StockReservationDTO): Promise<void> {
    try {
      await releaseMutation.mutateAsync(reservation.id);
      toast({ variant: 'success', title: 'Reservation released', description: `${reservation.quantity} unit${reservation.quantity === 1 ? '' : 's'} freed back to Available.` });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't release reservation", description: inventoryErrorMessage(error) });
    }
  }

  const reservations = data?.data ?? [];

  return (
    <div>
      {canManage && (
        <div className="mb-3 flex justify-end">
          <Button type="button" size="sm" onClick={() => setReserveOpen(true)}>
            Reserve stock
          </Button>
        </div>
      )}

      {status === 'pending' && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key -- skeleton placeholder rows have no stable identity
            <Skeleton key={i} shape="block" className="h-16 w-full" />
          ))}
        </div>
      )}

      {status === 'error' && <ErrorState onRetry={() => void refetch()} />}

      {status === 'success' && reservations.length === 0 && (
        <EmptyState
          icon={<Lock className="size-8" aria-hidden="true" />}
          title="No stock reserved"
          description={canManage ? 'Reserve stock to hold it for an offline order.' : 'No stock is currently reserved.'}
        />
      )}

      {status === 'success' && reservations.length > 0 && (
        <ol className="flex flex-col gap-3">
          {reservations.map((reservation) => (
            <li key={reservation.id} className="border-l-2 border-border pl-3">
              {/* Primary: how much, and is it still active. */}
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="body-strong" className="tabular-nums">
                  {reservation.quantity} unit{reservation.quantity === 1 ? '' : 's'} reserved
                </Text>
                <ReservationStatusBadge status={reservation.status} />
              </div>
              {/* Secondary: why — the merchant's own reference, or an honest "none given". */}
              <Text variant="body" className="mt-0.5 text-text-secondary">
                {reservationReferenceLabel(reservation)}
              </Text>
              {/* Tertiary: when, and (since this record carries no actor) where to find who. */}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Text variant="caption" className="text-text-secondary">
                  {reservation.createdAt ? `Reserved ${dayGroupLabel(reservation.createdAt)}, ${shortTime(reservation.createdAt)}` : 'Reserved'}
                  {' · '}
                  {reservation.expiresAt ? `Expires ${dayGroupLabel(reservation.expiresAt)}, ${shortTime(reservation.expiresAt)}` : "Doesn't expire"}
                </Text>
                {canViewActivity && (
                  <Link
                    to="/inventory/activity"
                    className="inline-flex items-center gap-1 text-caption text-text-secondary underline decoration-dotted underline-offset-2 hover:text-text-primary"
                  >
                    <History className="size-3" aria-hidden="true" />
                    Who reserved this?
                  </Link>
                )}
              </div>
              {canManage && reservation.status === 'active' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  aria-label={`Release reservation of ${reservation.quantity} unit${reservation.quantity === 1 ? '' : 's'}`}
                  loading={releaseMutation.isPending && releaseMutation.variables === reservation.id}
                  onClick={() => void handleRelease(reservation)}
                >
                  Release
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}

      {data?.meta?.last_page && data.meta.last_page > 1 && (
        <div className="mt-4">
          <Pagination currentPage={data.meta.current_page ?? page} totalPages={data.meta.last_page} onPageChange={setPage} />
        </div>
      )}

      <PlaceHoldDialog open={reserveOpen} onOpenChange={setReserveOpen} stockItem={stockItem} />
    </div>
  );
}
