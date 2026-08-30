import { useState } from 'react';
import { Languages, Plus, Pencil, Star, Archive, Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, Card, CardHeader, CardTitle, CardContent } from '@nexgen/ui';
import type { LocaleDTO } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission } from '../../framework/index.js';
import { localizationErrorMessage } from './shared/errors.js';
import { useLocales, useUpdateLocale, useArchiveLocale, useDeleteLocale } from './shared/queries.js';
import { LocaleFormDialog } from './LocaleFormDialog.js';

/** Real Locale CRUD — see `CurrenciesSection`'s own docblock for why this is a Settings-panel section, not a routed list page, and for the base/default-guard reasoning this mirrors exactly for the default locale. */
export function LocalesSection() {
  const { data, status, refetch } = useLocales();
  const locales = data?.data ?? [];
  const updateMutation = useUpdateLocale();
  const archiveMutation = useArchiveLocale();
  const deleteMutation = useDeleteLocale();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LocaleDTO | undefined>(undefined);

  function openCreate(): void {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(locale: LocaleDTO): void {
    setEditing(locale);
    setFormOpen(true);
  }

  const columns: DataTableColumn<LocaleDTO>[] = [
    {
      id: 'code',
      header: 'Code',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono">{row.code}</span>
          {row.isDefault && (
            <Badge variant="info">
              <Star className="mr-1 size-3" aria-hidden="true" /> Default
            </Badge>
          )}
        </div>
      ),
    },
    { id: 'name', header: 'Name', cell: (row) => row.name },
    { id: 'nativeName', header: 'Native name', cell: (row) => row.nativeName },
    { id: 'direction', header: 'Direction', cell: (row) => (row.isRtl ? 'Right-to-left' : 'Left-to-right') },
    { id: 'status', header: 'Status', cell: (row) => <Badge variant={row.status === 'active' ? 'success' : 'default'}>{row.status}</Badge> },
    {
      id: 'actions',
      header: '',
      className: 'w-40',
      cell: (row) => (
        <RequirePermission anyOf={['localization.locales.manage']} inline={null}>
          <div className="flex items-center justify-end gap-1">
            {!row.isDefault && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" aria-label={`Set ${row.code} as default locale`}>
                    <Star className="size-4" />
                  </Button>
                }
                title={`Set ${row.code} as the default locale?`}
                description="The default locale is the real fallback every customer-facing surface uses when no other locale applies."
                confirmLabel="Set as default"
                onConfirm={async () => {
                  await updateMutation.mutateAsync({ id: row.id, input: { isDefault: true, expectedVersion: row.version } });
                }}
                getErrorMessage={localizationErrorMessage}
              />
            )}
            <Button variant="ghost" size="sm" aria-label={`Edit ${row.code}`} onClick={() => openEdit(row)}>
              <Pencil className="size-4" />
            </Button>
            {!row.isDefault && (
              <>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" aria-label={`Archive ${row.code}`}>
                      <Archive className="size-4" />
                    </Button>
                  }
                  title={`Archive ${row.code}?`}
                  description="Archived locales stop appearing as an option for new content, but existing data referencing them is untouched."
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
          <Languages className="size-4 text-text-secondary" aria-hidden="true" /> Locales
        </CardTitle>
        <RequirePermission anyOf={['localization.locales.manage']} inline={null}>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" /> New locale
          </Button>
        </RequirePermission>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={locales}
          getRowId={(row) => row.id}
          status={status === 'pending' ? 'loading' : status === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ icon: <Languages className="size-8" aria-hidden="true" />, title: 'No locales yet', description: 'Add the locales this store presents content in.' }}
        />
      </CardContent>
      <LocaleFormDialog open={formOpen} onOpenChange={setFormOpen} locale={editing} />
    </Card>
  );
}
