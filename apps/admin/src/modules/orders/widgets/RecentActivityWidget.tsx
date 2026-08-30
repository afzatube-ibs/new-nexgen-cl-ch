import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { Text } from '@nexgen/ui';
import { DashboardWidgetCard } from '../../../framework/index.js';
import { humanizeAuditAction, shortTargetType } from '../shared/auditAction.js';
import { useStaffDirectory } from '../shared/queries.js';
import { useRecentOrderActivity } from './queries.js';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * "Recent Activity" — Orders' own audit log (`AuditLogController::index`,
 * already real and complete), the platform's own most central activity
 * stream. Named honestly: no unified cross-domain activity feed exists on
 * the real backend (every module owns its own separate audit log), so
 * this widget is scoped to what it actually shows, not a fabricated
 * platform-wide feed.
 */
export function RecentActivityWidget() {
  const { data, status, refetch } = useRecentOrderActivity();
  const { data: staff } = useStaffDirectory();
  const actorNameById = useMemo(() => new Map((staff ?? []).map((u) => [u.id, u.name])), [staff]);
  const entries = data?.data ?? [];

  return (
    <DashboardWidgetCard
      title="Recent Activity"
      icon={History}
      status={status}
      onRetry={() => void refetch()}
      action={
        <Link to="/orders/audit-log" className="text-caption text-brand hover:underline">
          View all
        </Link>
      }
    >
      {entries.length === 0 ? (
        <Text variant="body" className="text-text-secondary">
          Nothing recorded yet.
        </Text>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <Text variant="body" className="truncate">
                  {humanizeAuditAction(entry.action)}
                  {entry.targetType && <span className="text-text-secondary"> · {shortTargetType(entry.targetType)}</span>}
                </Text>
                <Text variant="caption" className="truncate text-text-secondary">
                  {entry.actorId ? (actorNameById.get(entry.actorId) ?? 'Staff') : 'System'}
                </Text>
              </div>
              <Text variant="caption" className="shrink-0 text-text-secondary">
                {formatDateTime(entry.createdAt)}
              </Text>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}
