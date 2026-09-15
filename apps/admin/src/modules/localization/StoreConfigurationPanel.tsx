import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Icon, Input, Select, Spinner, Text, useToast } from '@nexgen/ui';
import { PageHeader, RequirePermission } from '../../framework/index.js';
import { useAuth } from '../../auth/useAuth.js';
import { localizationErrorMessage } from './shared/errors.js';
import { useCreateStore, useCurrentStore, useUpdateStore, useCurrencies, useLocales } from './shared/queries.js';

const BANGLADESH_DEFAULTS = {
  currencyCode: 'BDT',
  locale: 'en',
  timezone: 'Asia/Dhaka',
  countryCode: 'BD',
};

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
  const createStoreMutation = useCreateStore();

  const [currencyCode, setCurrencyCode] = useState('');
  const [locale, setLocale] = useState('');
  const [timezone, setTimezone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [firstStore, setFirstStore] = useState({
    name: 'Lokkisona',
    contactEmail: '',
    contactPhone: '',
    addressLine1: '',
    city: 'Dhaka',
  });

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

  async function handleCreate(): Promise<void> {
    setFormError(null);
    if (!firstStore.name.trim() || !firstStore.contactEmail.trim() || !firstStore.addressLine1.trim() || !firstStore.city.trim()) {
      setFormError('Store name, email, address, and city are required.');
      return;
    }
    try {
      await createStoreMutation.mutateAsync({
        name: firstStore.name.trim(),
        currencyCode: BANGLADESH_DEFAULTS.currencyCode,
        locale: BANGLADESH_DEFAULTS.locale,
        timezone: BANGLADESH_DEFAULTS.timezone,
        contactEmail: firstStore.contactEmail.trim(),
        contactPhone: firstStore.contactPhone.trim() || null,
        addressLine1: firstStore.addressLine1.trim(),
        city: firstStore.city.trim(),
        countryCode: BANGLADESH_DEFAULTS.countryCode,
      });
      toast({ variant: 'success', title: 'Store created', description: 'Lokkisona is ready for branding, products, prices, and inventory.' });
    } catch (error) {
      setFormError(localizationErrorMessage(error));
    }
  }

  if (storeQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }


  if (storeQuery.isError) {
    return <Alert variant="danger" title="Could not load store settings">Check the API connection and try again.</Alert>;
  }

  if (!store) {
    return (
      <RequirePermission anyOf={['store_configuration.stores.view']}>
        <PageHeader title="Create your store" description="One short setup creates the store used by the admin, catalog, checkout, and storefront." />
        {formError && <Alert variant="danger" className="mb-4" role="alert">{formError}</Alert>}
        <Card>
          <CardHeader className="flex-row items-center gap-2"><Icon icon={Globe} className="text-brand" /><CardTitle>Store details</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Store name" value={firstStore.name} onChange={(event) => setFirstStore((value) => ({ ...value, name: event.target.value }))} />
              <Input label="Business email" type="email" value={firstStore.contactEmail} onChange={(event) => setFirstStore((value) => ({ ...value, contactEmail: event.target.value }))} />
              <Input label="Phone" value={firstStore.contactPhone} onChange={(event) => setFirstStore((value) => ({ ...value, contactPhone: event.target.value }))} />
              <Input label="City" value={firstStore.city} onChange={(event) => setFirstStore((value) => ({ ...value, city: event.target.value }))} />
            </div>
            <Input label="Business address" value={firstStore.addressLine1} onChange={(event) => setFirstStore((value) => ({ ...value, addressLine1: event.target.value }))} />
            <Text variant="caption" className="text-text-secondary">Defaults: BDT currency, Bangladesh, Asia/Dhaka timezone. These can be changed after setup.</Text>
            {canManage ? <div><Button onClick={() => void handleCreate()} loading={createStoreMutation.isPending}>Create store</Button></div> : <Alert variant="warning">You can view settings, but your account cannot create a store.</Alert>}
          </CardContent>
        </Card>
      </RequirePermission>
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
