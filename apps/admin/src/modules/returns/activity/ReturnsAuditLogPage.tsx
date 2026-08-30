import { useEffect, useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { DataTable, type DataTableColumn, Text, Select } from '@nexgen/ui';
import { RETURN_REQUEST_TARGET_TYPE, type ReturnsAuditLogDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar } from '../../../framework/index.js';
import { humanizeAuditAction, shortTargetType } from '../shared/auditAction.js';
import { useReturnsAuditLogs, useStaffDirectory } from './queries.js';

type TargetTypeFilter = 'all' | typeof RETURN_REQUEST_TARGET_TYPE;
const PAGE_SIZE = 25;

/**
 * Returns Audit Log — `returns.audit_log.view`, a real, complete,
 * server-paginated browse of `GET /returns/audit-logs`
 * (`AuditLogController::index`, Returns' own). Every return-request
 * lifecycle change is recorded here — mirrors Shipping's own
 * `ShippingAuditLogPage`/Fulfillment's own `FulfillmentAuditLogPage` design
 * directly (Type + Staff filters, no `target_id` filter, server
 * pagination), since the real backend constraint is identical.
 */
export function ReturnsAuditLogPage() {
  const [targetType, setTargetType] = useState<TargetTypeFilter>('all');
  const [actorId, setActorId] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, status, refetch } = useReturnsAuditLogs({
    targetType: targetType === 'all' ? undefined : targetType,
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

  useEffect(() => setPage(1), [targetType, actorId]);

  const columns: DataTableColumn<ReturnsAuditLogDTO>[] = [
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
      header: 'Target',
      cell: (row) => (
        <span className="text-text-secondary">
          {shortTargetType(row.targetType)}
          {row.targetId ? <span className="ml-1 font-mono text-caption">{row.targetId.slice(0, 8)}</span> : null}
        </span>
      ),
    },
  ];

  return (
    <div>
      <CrudPageLayout
        header={{ title: 'Returns Audit Log', description: 'Every recorded change to a return request.' }}
        toolbar={
          <Toolbar
            filters={
              <FilterBar
                active={[
                  ...(targetType === 'all' ? [] : [{ key: 'targetType', label: 'Type', displayValue: shortTargetType(targetType) }]),
                  ...(actorId === 'all' ? [] : [{ key: 'actorId', label: 'Staff', displayValue: actorNameById.get(actorId) ?? actorId }]),
                ]}
                onRemove={(key) => {
                  if (key === 'targetType') setTargetType('all');
                  if (key === 'actorId') setActorId('all');
                }}
                onClearAll={() => {
                  setTargetType('all');
                  setActorId('all');
                }}
              >
                <div className="flex flex-col gap-3">
                  <Select
                    label="Type"
                    value={targetType}
                    onValueChange={(v) => setTargetType(v as TargetTypeFilter)}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: RETURN_REQUEST_TARGET_TYPE, label: 'Return request' },
                    ]}
                  />
                  <Select label="Staff" value={actorId} onValueChange={setActorId} options={actorOptions} />
                </div>
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
          status={status === 'pending' ? 'loading' : status === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ icon: <History className="size-8" aria-hidden="true" />, title: 'No activity yet', description: 'Nothing has been recorded yet for this filter.' }}
        />
      </CrudPageLayout>
    </div>
  );
}
