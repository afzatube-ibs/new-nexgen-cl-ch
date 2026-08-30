import type { ComponentType, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Skeleton, ErrorState } from '@nexgen/ui';

export interface DashboardWidgetCardProps {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  /** A query's own `status` — `'pending'` is normalized to `'loading'` here so every widget can pass its `useQuery` result straight through. */
  status: 'loading' | 'pending' | 'error' | 'success';
  onRetry?: () => void;
  /** e.g. a "View all" link to the real list page this widget summarizes. */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Production Completion Plan v2, Milestone 8 (Dashboard Real Widgets) — the
 * one shared structural wrapper every real dashboard widget uses: a Card
 * with a title/icon/optional action, and the same loading-skeleton/error-
 * retry states this codebase's own list/detail pages already establish
 * (`DataTable`'s own `status` prop, `ErrorState`). No widget invents its
 * own loading or error presentation — only its own real body content once
 * `status === 'success'`.
 */
export function DashboardWidgetCard({ title, icon: Icon, status, onRetry, action, children }: DashboardWidgetCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-text-secondary" aria-hidden="true" />}
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {status === 'loading' || status === 'pending' ? (
          <div className="flex flex-col gap-2">
            <Skeleton shape="block" className="h-8 w-24" />
            <Skeleton shape="block" className="h-4 w-32" />
          </div>
        ) : status === 'error' ? (
          <ErrorState title="Couldn't load this" description="This widget's data could not be loaded." onRetry={onRetry} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
