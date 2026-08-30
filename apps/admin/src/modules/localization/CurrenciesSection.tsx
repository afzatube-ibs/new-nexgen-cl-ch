import { useState } from 'react';
import { Coins, Plus, Pencil, Star, Archive, Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, Card, CardHeader, CardTitle, CardContent } from '@nexgen/ui';
import type { CurrencyDTO } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission } from '../../framework/index.js';
import { localizationErrorMessage } from './shared/errors.js';
import { useCurrencies, useUpdateCurrency, useArchiveCurrency, useDeleteCurrency } from './shared/queries.js';
import { CurrencyFormDialog } from './CurrencyFormDialog.js';

/**
 * Real Currency CRUD, embedded as a Settings-panel section rather than its
 * own routed list page: this installation's own real currency count is a
 * handful (confirmed against the dev database — two real order currencies
 * in active use), the same order of magnitude Identity & Access's own
 * `RolesListPage` found for Roles — no search, no pagination toolbar,
 * matching that page's own precedent for a genuinely small real dataset.
 *
 * The base currency is shown with a lock icon and no archive/delete
 * action, mirroring `RolesListPage`'s own guard on the seeded
 * `administrator` role — a real, honest client-side guardrail against the
 * single most disruptive accidental mistake, backed by the real server-
 * side `CannotRemoveBaseCurrencyException` either way (see this module's
 * own `errors.ts`).
 */
export function CurrenciesSection() {
  const { data, status, refetch } = useCurrencies();
  const currencies = data?.data ?? [];
  const updateMutation = useUpdateCurrency();
  const archiveMutation = useArchiveCurrency();
  const deleteMutation = useDeleteCurrency();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CurrencyDTO | undefined>(undefined);

  function openCreate(): void {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(currency: CurrencyDTO): void {
    setEditing(currency);
    setFormOpen(true);
  }

  const columns: DataTableColumn<CurrencyDTO>[] = [
    {
      id: 'code',
      header: 'Code',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono">{row.code}</span>
          {row.isBase && (
            <Badge variant="info">
              <Star className="mr-1 size-3" aria-hidden="true" /> Base
            </Badge>
          )}
        </div>
      ),
    },
    { id: 'name', header: 'Name', cell: (row) => row.name },
    { id: 'symbol', header: 'Symbol', cell: (row) => row.symbol },
    { id: 'exchangeRate', header: 'Exchange rate', cell: (row) => <span className="tabular-nums">{row.exchangeRate}</span> },
    { id: 'status', header: 'Status', cell: (row) => <Badge variant={row.status === 'active' ? 'success' : 'default'}>{row.status}</Badge> },
    {
      id: 'actions',
      header: '',
      className: 'w-40',
      cell: (row) => (
        <RequirePermission anyOf={['localization.currencies.manage']} inline={null}>
          <div className="flex items-center justify-end gap-1">
            {!row.isBase && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" aria-label={`Set ${row.code} as base currency`}>
                    <Star className="size-4" />
                  </Button>
                }
                title={`Set ${row.code} as the base currency?`}
                description="Every other currency's exchange rate is expressed relative to whichever currency is base."
                confirmLabel="Set as base"
                onConfirm={async () => {
                  await updateMutation.mutateAsync({ id: row.id, input: { isBase: true, expectedVersion: row.version } });
                }}
                getErrorMessage={localizationErrorMessage}
              />
            )}
            <Button variant="ghost" size="sm" aria-label={`Edit ${row.code}`} onClick={() => openEdit(row)}>
              <Pencil className="size-4" />
            </Button>
            {!row.isBase && (
              <>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" aria-label={`Archive ${row.code}`}>
                      <Archive className="size-4" />
                    </Button>
                  }
                  title={`Archive ${row.code}?`}
                  description="Archived currencies stop appearing as an option for new prices, but existing data referencing them is untouched."
                  confirmLabel="Archive"
                  onConfirm={async () => {
                    await archiveMutation.mutateAsync({ id: row.id, input: { expectedVersion: row.version } });
                  }}
                  getErrorMessage={localizationErrorMessage}
                />
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" aria-label={`Delete ${row.code}`}>
                      <Trash2 className="size-4" />
                    </Button>
                  }
                  title={`Delete ${row.code}?`}
                  description="This cannot be undone."
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => deleteMutation.mutateAsync({ id: row.id, input: { expectedVersion: row.version } })}
                  getErrorMessage={localizationErrorMessage}
                />
              </>
            )}
          </div>
        </RequirePermission>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-4 text-text-secondary" aria-hidden="true" /> Currencies
        </CardTitle>
        <RequirePermission anyOf={['localization.currencies.manage']} inline={null}>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" /> New currency
          </Button>
        </RequirePermission>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={currencies}
          getRowId={(row) => row.id}
          status={status === 'pending' ? 'loading' : status === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ icon: <Coins className="size-8" aria-hidden="true" />, title: 'No currencies yet', description: 'Add the currencies this store prices and sells in.' }}
        />
      </CardContent>
      <CurrencyFormDialog open={formOpen} onOpenChange={setFormOpen} currency={editing} />
    </Card>
  );
}
