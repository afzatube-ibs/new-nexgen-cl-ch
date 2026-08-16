import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Eye } from 'lucide-react';
import { DataTable, type DataTableColumn, Text, Select, Button } from '@nexgen/ui';
import { type FulfillmentAuditLogDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, RequirePermission } from '../../../framework/index.js';
import { humanizeAuditAction, shortTargetType } from '../shared/auditAction.js';
import { useFulfillmentAuditLogs, useStaffDirectory } from './queries.js';

const PAGE_SIZE = 25;

/**
 * Fulfillment Audit Log — `fulfillment.audit_log.view`, a real, complete,
 * server-paginated browse of `GET /fulfillment/audit-logs`
 * (`AuditLogController::index`, Fulfillment's own). Every shipment
 * creation/pick/pack/dispatch/delivery/failure/cancellation is recorded
 * here — the destination for Shipment Detail's own "Audit" link. Only one
 * real target type exists in this module (`Shipment`), so no Type filter is
 * offered — unlike Shipping's own audit log, which spans three
 * configuration entities. No Action-type filter either: the real backend
 * (`AuditLogController::index`) supports only `actor_id`/`target_type`, no
 * `action` filter — confirmed by reading it directly — so one isn't
 * invented here, per "support only filters the backend already provides."
 *
 * Slice 2 usability improvement: every row's target is a real Shipment
 * (`targetType` is always `Shipment` in this module), so each row now
 * navigates straight to that Shipment's own Detail page — a genuine, real
 * cross-reference using data already returned by this endpoint, not an
 * invented capability.
 */
export function FulfillmentAuditLogPage() {
  const navigate = useNavigate();
  const [actorId, setActorId] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, status, refetch } = useFulfillmentAuditLogs({
    actorId: actorId === 'all' ? undefined : actorId,
    page,
    perPage: PAGE_SIZE,
  });
  const logs = useMemo(() => data?.data ?? [], [data]);

  const { data: staff } = useStaffDirectory();
  const actorNameById = useMemo(() => new Map((staff ?? []).map((u) => [u.id, u.name])), [staff]);
  const actorOptions = useMemo(
    () => [{ value: 'all', label: 'All staff' }, ...(staff ?? []).map((u) => ({ value: u.id, label: u.name }))],
    [staff],
  );

  useEffect(() => setPage(1), [actorId]);

  const columns: DataTableColumn<FulfillmentAuditLogDTO>[] = [
    {
      id: 'when',
      header: 'When',
      cell: (row) => (
        <span className="tabular-nums">{new Date(row.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: (row) => (row.actorId ? (actorNameById.get(row.actorId) ?? <span className="font-mono text-caption">{row.actorId.slice(0, 8)}</span>) : 'System'),
    },
    { id: 'action', header: 'Action', cell: (row) => <Text variant="body-strong">{humanizeAuditAction(row.action)}</Text> },
    {
      id: 'target',
      header: 'Shipment',
      cell: (row) => (
        <span className="text-text-secondary">
          {shortTargetType(row.targetType)}
          {row.targetId ? <span className="ml-1 font-mono text-caption">{row.targetId.slice(0, 8)}</span> : null}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      cell: (row) =>
        row.targetId ? (
          <RequirePermission anyOf={['fulfillment.shipments.view']} inline={null}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="View shipment"
              onClick={(e) => {
                e.stopPropagation();
                void navigate(`/shipping/shipments/${row.targetId}`);
              }}
            >
              <Eye className="size-4" />
            </Button>
          </RequirePermission>
        ) : null,
    },
  ];

  return (
    <div>
      <CrudPageLayout
        header={{ title: 'Fulfillment Audit Log', description: 'Every recorded change to a shipment — creation, dispatch, delivery, failure, and cancellation.' }}
        toolbar={
          <Toolbar
            filters={
              <FilterBar
                active={actorId === 'all' ? [] : [{ key: 'actorId', label: 'Staff', displayValue: actorNameById.get(actorId) ?? actorId }]}
                onRemove={() => setActorId('all')}
              >
                <Select label="Staff" value={actorId} onValueChange={setActorId} options={actorOptions} />
              </FilterBar>
            }
          />
        }
        pagination={data?.meta?.last_page ? { currentPage: data.meta.current_page ?? page, totalPages: data.meta.last_page, onPageChange: setPage } : undefined}
      >
        <DataTable
          columns={columns}
          data={logs}
          getRowId={(row) => row.id}
          onRowClick={(row) => row.targetId && void navigate(`/shipping/shipments/${row.targetId}`)}
          status={status === 'pending' ? 'loading' : status === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ icon: <History className="size-8" aria-hidden="true" />, title: 'No activity yet', description: 'Nothing has been recorded yet for this filter.' }}
        />
      </CrudPageLayout>
    </div>
  );
}
