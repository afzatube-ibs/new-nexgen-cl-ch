import { PageHeader, RequirePermission } from '../../framework/index.js';
import { CurrenciesSection } from './CurrenciesSection.js';
import { LocalesSection } from './LocalesSection.js';

/**
 * Production Completion Plan v2, Milestone 10 (Localization Admin) — real
 * Currency and Locale management, on top of the real, already-complete
 * backend `app/Domains/Platform/Localization`. Two sections rather than a
 * nested tab bar inside this one Settings tab — both real datasets are
 * small (see `CurrenciesSection`'s own docblock), and stacking them
 * vertically keeps every row visible without an extra layer of
 * navigation. `localization.locales.view`/`localization.currencies.view`
 * gate each section independently — a caller with only one of the two
 * still sees a real, honest panel rather than nothing at all.
 */
export function LocalizationPanel() {
  return (
    <div>
      <PageHeader title="Localization" description="The real currencies and locales this store can price, sell, and present content in." />
      <div className="flex flex-col gap-6">
        <RequirePermission anyOf={['localization.currencies.view']} inline={null}>
          <CurrenciesSection />
        </RequirePermission>
        <RequirePermission anyOf={['localization.locales.view']} inline={null}>
          <LocalesSection />
        </RequirePermission>
      </div>
    </div>
  );
}
