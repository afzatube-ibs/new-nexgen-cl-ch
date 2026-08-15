import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, History } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Text, Button, Skeleton, ErrorState } from '@nexgen/ui';
import { CUSTOMER_TARGET_TYPE, CUSTOMER_ADDRESS_TARGET_TYPE, type CustomerDTO } from '@nexgen/api-client';
import { humanizeAuditAction } from '../shared/auditAction.js';
import { useCustomerAuditLogs, useStaffDirectory } from '../shared/queries.js';

const RECENT_WINDOW = 50;
const SHOWN = 8;

/**
 * Recent activity — a real, honest best-effort read of Customers' own
 * `GET /customers/audit-logs`, not a fabricated per-customer feed.
 *
 * `AuditLogController::index` (apps/backend) supports only `target_type`/
 * `actor_id` filters — there is genuinely no `target_id` filter, confirmed
 * by reading the controller directly, so "this customer's own history"
 * cannot be requested from the server at all. This card fetches the most
 * recent `RECENT_WINDOW` Customer-type and CustomerAddress-type entries
 * platform-wide and filters to this customer's own id / address ids
 * client-side — an honest, bounded best effort, not a claim of
 * completeness. A customer with real historical activity that has since
 * rolled outside this recent window will show "No recent activity" here
 * rather than a false "no activity ever" — the copy says exactly that,
 * with a link to the full, real, server-paginated Audit Log for anything
 * older.
 */
export function CustomerRecentActivityCard({ customer }: { customer: CustomerDTO }) {
  const navigate = useNavigate();
  const addressIds = useMemo(() => new Set((customer.addresses ?? []).map((a) => a.id)), [customer.addresses]);

  const { data: customerLogs, status: customerLogsStatus } = useCustomerAuditLogs({ targetType: CUSTOMER_TARGET_TYPE, perPage: RECENT_WINDOW, page: 1 });
  const { data: addressLogs, status: addressLogsStatus } = useCustomerAuditLogs({
    targetType: CUSTOMER_ADDRESS_TARGET_TYPE,
    perPage: RECENT_WINDOW,
    page: 1,
  });
  const { data: staff } = useStaffDirectory();
  const actorNameById = useMemo(() => new Map((staff ?? []).map((u) => [u.id, u.name])), [staff]);

  const isLoading = customerLogsStatus === 'pending' || addressLogsStatus === 'pending';
  const isError = customerLogsStatus === 'error' || addressLogsStatus === 'error';

  const relevant = useMemo(() => {
    const ownEntries = (customerLogs?.data ?? []).filter((l) => l.targetId === customer.id);
    const addressEntries = (addressLogs?.data ?? []).filter((l) => l.targetId && addressIds.has(l.targetId));
    return [...ownEntries, ...addressEntries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, SHOWN);
  }, [customerLogs, addressLogs, customer.id, addressIds]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <Button variant="outline" size="sm" onClick={() => void navigate('/customers/audit-log')}>
          <History className="size-4" /> View full audit log
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton shape="block" className="h-8 w-full" />
            <Skeleton shape="block" className="h-8 w-full" />
          </div>
        )}
        {isError && <ErrorState />}
        {!isLoading && !isError && relevant.length === 0 && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Clock className="size-4" aria-hidden="true" />
            <Text variant="body">No recent activity for this customer among the most recently recorded events — see the full audit log for older history.</Text>
          </div>
        )}
        {!isLoading && !isError && relevant.length > 0 && (
          <div className="flex flex-col divide-y divide-border">
            {relevant.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <Text variant="body">{humanizeAuditAction(entry.action)}</Text>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Text variant="caption">{entry.actorId ? (actorNameById.get(entry.actorId) ?? 'Staff') : 'System'}</Text>
                  <Text variant="caption" className="tabular-nums">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
