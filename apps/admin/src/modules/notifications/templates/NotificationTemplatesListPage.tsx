import { useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, ToggleLeft, ToggleRight, MailPlus } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select } from '@nexgen/ui';
import type { NotificationTemplateDTO, NotificationTemplateChannel } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, RequirePermission } from '../../../framework/index.js';
import { useNotificationTemplates, useUpdateNotificationTemplate } from '../shared/queries.js';
import { NotificationTemplateFormDialog } from './NotificationTemplateFormDialog.js';

type ChannelFilter = 'all' | NotificationTemplateChannel;

/**
 * `NotificationTemplateController::index`'s own `q` filter is genuinely
 * server-side (confirmed by reading it directly) — firing it on every
 * keystroke would be the identical class of issue Customers' own Freeze
 * Audit found and fixed for its own search box, applied here from the
 * start rather than repeating that finding on a second module.
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Notification Templates — `notifications.templates.view`. `NotificationTemplateController::
 * index` genuinely supports server-side `channel`/`code`/`q` (a real
 * in-module free-text search, confirmed by reading the controller
 * directly — never routed through Search), hardcoded `orderBy('code')`,
 * Laravel's own default pagination.
 *
 * No delete/archive endpoint exists for a template (confirmed via
 * `routes.php` directly) — the real, only lifecycle action is toggling
 * `isActive`, offered inline from the row menu (an `updateNotificationTemplate`
 * call with every other field unchanged), never a fabricated "Delete."
 */
export function NotificationTemplatesListPage() {
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateDTO | undefined>(undefined);

  const debouncedSearch = useDebouncedValue(search, 350);
  useEffect(() => setPage(1), [channel, debouncedSearch]);

  const { data, status, refetch } = useNotificationTemplates({
    channel: channel === 'all' ? undefined : channel,
    q: debouncedSearch.trim() || undefined,
    page,
  });
  const templates = useMemo(() => data?.data ?? [], [data]);

  const updateMutation = useUpdateNotificationTemplate();

  function toggleActive(template: NotificationTemplateDTO): void {
    void updateMutation.mutateAsync({ id: template.id, input: { isActive: !template.isActive, expectedVersion: template.version } });
  }

  const columns: DataTableColumn<NotificationTemplateDTO>[] = [
    { id: 'code', header: 'Code', cell: (row) => <span className="font-mono text-caption">{row.code}</span> },
    { id: 'channel', header: 'Channel', cell: (row) => <span className="capitalize">{row.channel.replace('_', '-')}</span> },
    { id: 'locale', header: 'Locale', cell: (row) => row.locale },
    { id: 'subject', header: 'Subject', cell: (row) => row.subject ?? '—' },
    { id: 'status', header: 'Status', cell: (row) => <Badge variant={row.isActive ? 'success' : 'default'}>{row.isActive ? 'active' : 'inactive'}</Badge> },
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <RequirePermission anyOf={['notifications.templates.manage']} inline={null}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={`Actions for ${row.code}`} onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onSelect={() => {
                  setEditingTemplate(row);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toggleActive(row)}>
                {row.isActive ? (
                  <>
                    <ToggleLeft className="size-4" /> Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="size-4" /> Activate
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </RequirePermission>
      ),
    },
  ];

  return (
    <>
      <CrudPageLayout
        header={{
          title: 'Notification Templates',
          description: 'The content every automated customer notification sends.',
          actions: (
            <RequirePermission anyOf={['notifications.templates.manage']} inline={null}>
              <Button
                onClick={() => {
                  setEditingTemplate(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> New template
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search code, subject, or body…"
            filters={
              <FilterBar
                active={channel === 'all' ? [] : [{ key: 'channel', label: 'Channel', displayValue: channel }]}
                onRemove={() => setChannel('all')}
              >
                <Select
                  label="Channel"
                  value={channel}
                  onValueChange={(v) => setChannel(v as ChannelFilter)}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'email', label: 'Email' },
                    { value: 'sms', label: 'SMS' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                    { value: 'in_app', label: 'In-app' },
                  ]}
                />
              </FilterBar>
            }
          />
        }
        pagination={data?.meta?.last_page ? { currentPage: data.meta.current_page ?? page, totalPages: data.meta.last_page, onPageChange: setPage } : undefined}
      >
        <DataTable
          columns={columns}
          data={templates}
          getRowId={(row) => row.id}
          status={status === 'pending' ? 'loading' : status === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{
            icon: <MailPlus className="size-8" aria-hidden="true" />,
            title: search || channel !== 'all' ? 'No matching templates' : 'No templates yet',
            description: search || channel !== 'all' ? 'No templates match the current filter.' : 'Create a template to define what an automated notification says.',
          }}
        />
      </CrudPageLayout>
      <NotificationTemplateFormDialog open={formOpen} onOpenChange={setFormOpen} template={editingTemplate} />
    </>
  );
}
