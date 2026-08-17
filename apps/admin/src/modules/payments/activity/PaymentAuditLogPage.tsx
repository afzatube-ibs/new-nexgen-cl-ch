import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Eye } from 'lucide-react';
import { DataTable, type DataTableColumn, Text, Select, Button } from '@nexgen/ui';
import { type PaymentAuditLogDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, RequirePermission } from '../../../framework/index.js';
import { humanizeAuditAction, shortTargetType } from '../shared/auditAction.js';
import { usePaymentAuditLogs, useStaffDirectory } from './queries.js';

const PAGE_SIZE = 25;

/**
 * Payments Audit Log — `payments.audit_log.view`, a real, complete,
 * server-paginated browse of `GET /payments/audit-logs`
 * (`AuditLogController::index`, Payments' own). Every initiate/authorize/
 * capture/cancel/void/refund/bank-transfer-proof/webhook-rejection is
 * recorded here — the destination for Payment Detail's own "Audit" link.
 * Only one real target type exists in this module (`Payment` — confirmed
 * by reading every Action's own `AuditLogger::log()` call, each passing
 * `targetType: Payment::class`), so no Type filter is offered. No
 * Action-type filter either: the real backend (`AuditLogController::
 * index`) supports only `actor_id`/`target_type`, no `action` filter —
 * confirmed by reading it directly.
 *
 * Every row's target is a real Payment, so each row navigates straight to
 * that Payment's own Detail page — a real cross-reference using data
 * already returned by this endpoint.
 */
export function PaymentAuditLogPage() {
  const navigate = useNavigate();
  const [actorId, setActorId] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, status, refetch } = usePaymentAuditLogs({
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

  const columns: DataTableColumn<PaymentAuditLogDTO>[] = [
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
      header: 'Payment',
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
          <RequirePermission anyOf={['payments.payments.view']} inline={null}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="View payment"
              onClick={(e) => {
                e.stopPropagation();
                void navigate(`/payments/payments/${row.targetId}`);
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
        header={{ title: 'Payments Audit Log', description: 'Every recorded change to a payment — initiation, authorization, capture, cancellation, void, and refund.' }}
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
          onRowClick={(row) => row.targetId && void navigate(`/payments/payments/${row.targetId}`)}
          status={status === 'pending' ? 'loading' : status === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ icon: <History className="size-8" aria-hidden="true" />, title: 'No activity yet', description: 'Nothing has been recorded yet for this filter.' }}
        />
      </CrudPageLayout>
    </div>
  );
}
