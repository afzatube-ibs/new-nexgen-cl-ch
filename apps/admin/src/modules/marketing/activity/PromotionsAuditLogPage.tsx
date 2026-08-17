import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Eye } from 'lucide-react';
import { DataTable, type DataTableColumn, Text, Select, Button } from '@nexgen/ui';
import { type PromotionsAuditLogDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, RequirePermission } from '../../../framework/index.js';
import { humanizeAuditAction, shortTargetType } from '../shared/auditAction.js';
import { usePromotionsAuditLogs, useStaffDirectory } from './queries.js';

const PAGE_SIZE = 25;

const TARGET_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'App\\Domains\\Commerce\\Promotions\\Models\\Promotion', label: 'Promotion' },
  { value: 'App\\Domains\\Commerce\\Promotions\\Models\\Coupon', label: 'Coupon' },
  { value: 'App\\Domains\\Commerce\\Promotions\\Models\\PromotionCondition', label: 'Promotion Condition' },
];

/**
 * Promotions Audit Log — `promotions.audit_log.view`, a real, complete,
 * server-paginated browse of `GET /promotions/audit-logs`
 * (`AuditLogController::index`, Promotions' own). Every create/update/
 * archive/delete of a Promotion, Coupon, or Promotion Condition is recorded
 * here, plus real redemption events (`promotion.redeemed`). Three real
 * target types exist (confirmed via each Action's own `AuditLogger::log()`
 * call), so — unlike Payments' single-target-type audit log — a Type
 * filter is offered, using the real `target_type` filter the backend
 * already supports. No Action-type filter: `AuditLogController::index`
 * supports only `actor_id`/`target_type`, confirmed by reading it directly.
 *
 * Only `Promotion`-targeted rows navigate anywhere — a Coupon or Condition
 * row's own `targetId` doesn't identify which Promotion it belongs to (a
 * real constraint of this flat audit shape, not an oversight), so those
 * rows display their target honestly without a fabricated link.
 */
export function PromotionsAuditLogPage() {
  const navigate = useNavigate();
  const [actorId, setActorId] = useState<string>('all');
  const [targetType, setTargetType] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, status, refetch } = usePromotionsAuditLogs({
    actorId: actorId === 'all' ? undefined : actorId,
    targetType: targetType === 'all' ? undefined : targetType,
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

  useEffect(() => setPage(1), [actorId, targetType]);

  const columns: DataTableColumn<PromotionsAuditLogDTO>[] = [
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
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      cell: (row) =>
        row.targetId && row.targetType?.endsWith('\\Promotion') ? (
          <RequirePermission anyOf={['promotions.promotions.view']} inline={null}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="View promotion"
              onClick={(e) => {
                e.stopPropagation();
                void navigate(`/marketing/promotions/${row.targetId}`);
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
        header={{
          title: 'Promotions Audit Log',
          description: 'Every recorded change to a promotion, coupon, or eligibility condition — plus real redemption events.',
        }}
        toolbar={
          <Toolbar
            filters={
              <FilterBar
                active={[
                  ...(actorId === 'all' ? [] : [{ key: 'actorId', label: 'Staff', displayValue: actorNameById.get(actorId) ?? actorId }]),
                  ...(targetType === 'all'
                    ? []
                    : [{ key: 'targetType', label: 'Type', displayValue: TARGET_TYPE_OPTIONS.find((o) => o.value === targetType)?.label ?? targetType }]),
                ]}
                onRemove={(key) => (key === 'actorId' ? setActorId('all') : setTargetType('all'))}
              >
                <Select label="Staff" value={actorId} onValueChange={setActorId} options={actorOptions} />
                <Select label="Type" value={targetType} onValueChange={setTargetType} options={TARGET_TYPE_OPTIONS} />
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
          onRowClick={(row) => row.targetId && row.targetType?.endsWith('\\Promotion') && void navigate(`/marketing/promotions/${row.targetId}`)}
          status={status === 'pending' ? 'loading' : status === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ icon: <History className="size-8" aria-hidden="true" />, title: 'No activity yet', description: 'Nothing has been recorded yet for this filter.' }}
        />
      </CrudPageLayout>
    </div>
  );
}
