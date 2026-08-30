import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Icon, Input, Select, Spinner, Text, useToast } from '@nexgen/ui';
import { PageHeader, RequirePermission } from '../../framework/index.js';
import { useAuth } from '../../auth/useAuth.js';
import { localizationErrorMessage } from './shared/errors.js';
import { useCurrentStore, useUpdateStore, useCurrencies, useLocales } from './shared/queries.js';

/**
 * Production Completion Plan v2, Milestone 10 (Settings Framework
 * Population) — the real, previously-unexposed part of the `Store`
 * resource: `currencyCode`/`locale`/`timezone`. `UpdateStoreRequest`
 * (apps/backend) has always accepted these three fields, and
 * `packages/api-client`'s own `updateStore()` already sent them — but no
 * screen anywhere in the Admin app ever showed them, confirmed by reading
 * every existing consumer directly. `name`/contact/address are
 * deliberately NOT duplicated here — those are already real, editable
 * fields on Appearance's own Branding screen (`Store identity` card); this
 * panel owns exactly the fields that screen does not, per this
 * engagement's "never duplicate business logic" instruction.
 */
export function StoreConfigurationPanel() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('store_configuration.stores.manage');

  const storeQuery = useCurrentStore();
  const store = storeQuery.data?.[0];
  const currenciesQuery = useCurrencies({ status: 'active' });
  const localesQuery = useLocales({ status: 'active' });
  const updateStoreMutation = useUpdateStore();

  const [currencyCode, setCurrencyCode] = useState('');
  const [locale, setLocale] = useState('');
  const [timezone, setTimezone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (store) {
      setCurrencyCode(store.currencyCode);
      setLocale(store.locale);
      setTimezone(store.timezone);
    }
  }, [store]);

  async function handleSave(): Promise<void> {
    if (!store) return;
    setFormError(null);
    try {
      await updateStoreMutation.mutateAsync({ id: store.id, changes: { currencyCode, locale, timezone }, expectedVersion: store.version });
      toast({ variant: 'success', title: 'Store configuration saved' });
    } catch (error) {
      setFormError(localizationErrorMessage(error));
    }
  }

  if (storeQuery.isLoading || !store) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const currencyOptions = (currenciesQuery.data?.data ?? []).map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));
  const localeOptions = (localesQuery.data?.data ?? []).map((l) => ({ value: l.code, label: `${l.name} (${l.code})` }));
  const dirty = currencyCode !== store.currencyCode || locale !== store.locale || timezone !== store.timezone;

  return (
    <RequirePermission anyOf={['store_configuration.stores.view']}>
      <PageHeader title="Store Configuration" description="Your store's real default currency, locale, and timezone." />
      {formError && (
        <Alert variant="danger" className="mb-4" role="alert">
          {formError}
        </Alert>
      )}
      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <Icon icon={Globe} className="text-brand" />
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Default currency"
              value={currencyCode}
              onValueChange={setCurrencyCode}
              options={currencyOptions.length > 0 ? currencyOptions : [{ value: currencyCode, label: currencyCode }]}
              disabled={!canManage}
            />
            <Select
              label="Default locale"
              value={locale}
              onValueChange={setLocale}
              options={localeOptions.length > 0 ? localeOptions : [{ value: locale, label: locale }]}
              disabled={!canManage}
            />
          </div>
          <Input
            label="Timezone"
            hint="A valid IANA timezone identifier, e.g. Asia/Dhaka or America/New_York."
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={!canManage}
          />
          {currencyOptions.length === 0 && (
            <Text variant="caption" className="text-text-secondary">
              No active currencies exist yet — add one under Localization below before changing this.
            </Text>
          )}
          {canManage && (
            <div>
              <Button onClick={() => void handleSave()} loading={updateStoreMutation.isPending} disabled={!dirty}>
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </RequirePermission>
  );
}
