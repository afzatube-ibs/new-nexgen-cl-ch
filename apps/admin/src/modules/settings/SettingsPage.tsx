import { useMemo } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { EmptyState, Tabs, TabsList, TabsTrigger, TabsContent } from '@nexgen/ui';
import { PageHeader } from '../../framework/PageHeader.js';
import { useAuth } from '../../auth/useAuth.js';
import { getSettingsPanels } from '../../registry/moduleRegistry.js';

/**
 * Settings Framework (Phase 2.1 §8): "implement the framework only... no
 * hardcoded settings pages." This module registers itself (nav entry +
 * route) but contributes zero `settingsPanels` — every tab rendered here
 * comes from another module's own registration. As of Production
 * Completion Plan v2, Milestone 10, the `localization` module registers
 * the first two real panels (Store Configuration, Localization) — see its
 * own `module.ts`. The Empty State below still renders honestly for an
 * operator whose real permissions grant none of the registered panels.
 */
export function SettingsPage() {
  const { permissions } = useAuth();
  const panels = useMemo(() => getSettingsPanels(permissions), [permissions]);

  return (
    <div>
      <PageHeader title="Settings" description="Configuration for every module, in one place." />
      {panels.length === 0 ? (
        <EmptyState
          icon={<SettingsIcon className="size-8" />}
          title="No settings panels yet"
          description="Each module's own settings panel appears here automatically once that module is built and registered."
        />
      ) : (
        <Tabs defaultValue={panels[0]!.id}>
          <TabsList>
            {panels.map((panel) => (
              <TabsTrigger key={panel.id} value={panel.id}>
                {panel.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {panels.map((panel) => {
            const PanelComponent = panel.component;
            return (
              <TabsContent key={panel.id} value={panel.id}>
                <PanelComponent />
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
