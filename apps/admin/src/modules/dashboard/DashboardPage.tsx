import { useMemo } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { EmptyState } from '@nexgen/ui';
import { PageHeader } from '../../framework/PageHeader.js';
import { useAuth } from '../../auth/useAuth.js';
import { getDashboardWidgets } from '../../registry/moduleRegistry.js';

const SPAN_CLASS: Record<4 | 6 | 8 | 12, string> = {
  4: 'col-span-12 md:col-span-4',
  6: 'col-span-12 md:col-span-6',
  8: 'col-span-12 md:col-span-8',
  12: 'col-span-12',
};

/**
 * The real dashboard framework (Phase 2.1 §5): renders whatever widgets are
 * registered (`ModuleDefinition.dashboardWidgets`) for the current
 * operator's permissions. No business module exists yet, so this is
 * genuinely, correctly empty out of the box — a real Empty State, never a
 * fabricated KPI card standing in for data that doesn't exist.
 */
export function DashboardPage() {
  const { permissions } = useAuth();
  const widgets = useMemo(() => getDashboardWidgets(permissions), [permissions]);

  return (
    <div>
      <PageHeader title="Dashboard" description="An overview of your store, built from what each module contributes." />
      {widgets.length === 0 ? (
        <EmptyState
          icon={<LayoutDashboard className="size-8" />}
          title="No dashboard widgets yet"
          description="Widgets appear here automatically as business modules are built and registered — nothing to configure."
        />
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {widgets.map((widget) => {
            const WidgetComponent = widget.component;
            return (
              <div key={widget.id} className={SPAN_CLASS[widget.span]}>
                <WidgetComponent />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
