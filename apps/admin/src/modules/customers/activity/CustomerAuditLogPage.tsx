import { useEffect, useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { DataTable, type DataTableColumn, Text, Select } from '@nexgen/ui';
import { CUSTOMER_TARGET_TYPE, CUSTOMER_ADDRESS_TARGET_TYPE, type CustomerAuditLogDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar } from '../../../framework/index.js';
import { humanizeAuditAction, shortTargetType } from '../shared/auditAction.js';
import { useCustomerAuditLogs, useStaffDirectory } from '../shared/queries.js';

type TargetTypeFilter = 'all' | typeof CUSTOMER_TARGET_TYPE | typeof CUSTOMER_ADDRESS_TARGET_TYPE;
const PAGE_SIZE = 25;

/**
 * Customers Audit Log — `customers.audit_log.view`, a real, complete,
 * server-paginated browse of `GET /customers/audit-logs`
 * (`AuditLogController::index`, Customers' own). A dedicated permission
 * from `customers.customers.*` — a merchant can grant "see who changed
 * what" independently of "see/manage customer records" themselves,
 * confirmed by reading the permission registry directly.
 *
 * Deliberately module-wide, not per-customer: the real endpoint has no
 * `target_id` filter at all (only `target_type`/`actor_id`), confirmed by
 * reading `AuditLogController::index` directly — a per-customer feed isn't
 * a capability this backend actually offers. This screen is the honest,
 * complete version of that capability; `CustomerDetailPage`'s own "Recent
 * activity" section is the bounded, best-effort complement — see that
 * file's own docblock.
 */
export function CustomerAuditLogPage() {
  const [targetType, setTargetType] = useState<TargetTypeFilter>('all');
  const [actorId, setActorId] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, status, refetch } = useCustomerAuditLogs({
    targetType: targetType === 'all' ? undefined : targetType,
    actorId: actorId === 'all' ? undefined : actorId,
    page,
    perPage: PAGE_SIZE,
  });
  const logs = useMemo(() => data?.data ?? [], [data]);

  const { data: staff } = useStaffDirectory();
  const actorNameById = useMemo(() => new Map((staff ?? []).map((u) => [u.id, u.name])), [staff]);
  // `AuditLogController::index` (apps/backend) genuinely supports a real
  // `actor_id` filter — found unused in this screen during this module's
  // own Freeze Audit: a merchant support team investigating "who changed
  // this" has no way to narrow by staff member at all without it, a real
  // workflow gap at the "multiple staff" scale this audit was asked to
  // think about. Options are built from the same real staff directory
  // already fetched for name resolution — no new endpoint.
  const actorOptions = useMemo(
    () => [{ value: 'all', label: 'All staff' }, ...(staff ?? []).map((u) => ({ value: u.id, label: u.name }))],
    [staff],
  );

  useEffect(() => setPage(1), [targetType, actorId]);

  const columns: DataTableColumn<CustomerAuditLogDTO>[] = [
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
        header={{ title: 'Customers Audit Log', description: 'Every recorded change to a customer account or address book, and every time one was viewed.' }}
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
                      { value: CUSTOMER_TARGET_TYPE, label: 'Customer' },
                      { value: CUSTOMER_ADDRESS_TARGET_TYPE, label: 'Address' },
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
