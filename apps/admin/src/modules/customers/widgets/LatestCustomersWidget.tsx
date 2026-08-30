import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Text } from '@nexgen/ui';
import { DashboardWidgetCard } from '../../../framework/index.js';
import { useCustomers } from '../shared/queries.js';

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
}

/** The real "Latest Customers" widget — `CustomerController::index`'s own default `sort=created_at`/`direction=desc`, already newest-first; just the first few rows. */
export function LatestCustomersWidget() {
  const { data, status, refetch } = useCustomers({ perPage: 5 });
  const customers = data?.data ?? [];

  return (
    <DashboardWidgetCard
      title="Latest Customers"
      icon={UserPlus}
      status={status}
      onRetry={() => void refetch()}
      action={
        <Link to="/customers" className="text-caption text-brand hover:underline">
          View all
        </Link>
      }
    >
      {customers.length === 0 ? (
        <Text variant="body" className="text-text-secondary">
          No customers yet.
        </Text>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {customers.map((customer) => (
            <Link key={customer.id} to={`/customers/${customer.id}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:bg-surface-subtle">
              <div className="min-w-0">
                <Text variant="body-strong" className="truncate">
                  {customer.name}
                </Text>
                <Text variant="caption" className="truncate text-text-secondary">
                  {customer.email}
                </Text>
              </div>
              <Text variant="caption" className="shrink-0 text-text-secondary">
                {formatDate(customer.createdAt)}
              </Text>
            </Link>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}
