import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Menu as MenuIcon, Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Icon, Input, Spinner, Text, useToast } from '@nexgen/ui';
import type { CmsMenuDTO, CmsMenuItemDTO, SaveCmsMenuInput } from '@nexgen/api-client';
import { PageHeader, RequirePermission } from '../../framework/index.js';
import { useAuth } from '../../auth/useAuth.js';
import {
  useCmsMenus,
  useCreateCmsMenu,
  useCurrentStore,
  usePublishCmsMenu,
  useUnpublishCmsMenu,
  useUpdateCmsMenu,
} from './queries.js';

interface MenuDraft {
  handle: string;
  title: string;
  items: CmsMenuItemDTO[];
}

const EMPTY_DRAFT: MenuDraft = { handle: 'main-navigation', title: 'Main navigation', items: [] };

function draftFromMenu(menu: CmsMenuDTO): MenuDraft {
  return { handle: menu.handle, title: menu.title, items: menu.items.map((item) => ({ ...item })) };
}

function normalizeHandle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function newMenuItem(): CmsMenuItemDTO {
  return { id: crypto.randomUUID(), label: '', href: '/' };
}

export function CmsMenusPage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('cms.menus.manage');
  const canPublish = can('cms.menus.publish');

  const storeQuery = useCurrentStore();
  const store = storeQuery.data?.[0];
  const menusQuery = useCmsMenus(store?.id);
  const createMutation = useCreateCmsMenu(store?.id);
  const updateMutation = useUpdateCmsMenu(store?.id);
  const publishMutation = usePublishCmsMenu(store?.id);
  const unpublishMutation = useUnpublishCmsMenu(store?.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<MenuDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  const selected = useMemo(() => menusQuery.data?.find((menu) => menu.id === selectedId) ?? null, [menusQuery.data, selectedId]);

  useEffect(() => {
    if (!creating && !selectedId && menusQuery.data?.length) setSelectedId(menusQuery.data[0]?.id ?? null);
  }, [creating, menusQuery.data, selectedId]);

  useEffect(() => {
    if (creating) {
      setDraft(EMPTY_DRAFT);
      return;
    }
    if (selected) setDraft(draftFromMenu(selected));
  }, [creating, selected]);

  function beginCreate() {
    setCreating(true);
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
  }

  function selectMenu(menu: CmsMenuDTO) {
    setCreating(false);
    setSelectedId(menu.id);
    setFormError(null);
  }

  function updateItem(index: number, changes: Partial<CmsMenuItemDTO>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)),
    }));
  }

  function removeItem(index: number) {
    setDraft((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.items.length) return current;
      const items = [...current.items];
      const [item] = items.splice(index, 1);
      if (!item) return current;
      items.splice(target, 0, item);
      return { ...current, items };
    });
  }

  async function save() {
    if (!store) return;
    setFormError(null);
    const title = draft.title.trim();
    const handle = normalizeHandle(draft.handle);
    const items = draft.items.map((item) => ({ ...item, label: item.label.trim(), href: item.href.trim() }));

    if (!title || !handle) {
      setFormError('Menu title and handle are required.');
      return;
    }
    if (items.some((item) => !item.label || !item.href)) {
      setFormError('Every menu item needs a label and destination.');
      return;
    }

    const input: SaveCmsMenuInput = { title, handle, items };

    try {
      if (creating) {
        const menu = await createMutation.mutateAsync(input);
        setCreating(false);
        setSelectedId(menu.id);
        toast({ variant: 'success', title: 'Menu draft created', description: 'Publish it when the navigation is ready.' });
      } else if (selected) {
        await updateMutation.mutateAsync({ menuId: selected.id, input, expectedVersion: selected.lockVersion });
        toast({ variant: 'success', title: 'Menu draft saved' });
      }
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function publish() {
    if (!selected) return;
    setFormError(null);
    try {
      await publishMutation.mutateAsync({ menuId: selected.id, expectedVersion: selected.lockVersion });
      toast({
        variant: 'success',
        title: 'Menu published',
        description: selected.handle === 'main-navigation' ? 'The Storefront header now uses this navigation.' : 'The menu is now available to the Storefront.',
      });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function unpublish() {
    if (!selected) return;
    setFormError(null);
    try {
      await unpublishMutation.mutateAsync({ menuId: selected.id, expectedVersion: selected.lockVersion });
      toast({ variant: 'success', title: 'Menu unpublished' });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  if (storeQuery.isLoading || menusQuery.isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner /></div>;
  }

  if (!store) {
    return <Alert variant="warning" title="No store configured">Create the store first, then configure navigation.</Alert>;
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <RequirePermission anyOf={['cms.menus.view']}>
      <PageHeader
        title="Navigation"
        description="Build merchant-controlled Storefront menus. Publish a menu with handle main-navigation to replace the automatic category navigation."
        actions={canManage ? <Button onClick={beginCreate}><Icon icon={Plus} size="inline" /> New menu</Button> : undefined}
      />

      {formError && <Alert variant="danger" className="mb-6" role="alert">{formError}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Menus</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(menusQuery.data ?? []).length === 0 && !creating && <Text variant="body" className="text-text-secondary">No menus yet.</Text>}
            {(menusQuery.data ?? []).map((menu) => (
              <button
                key={menu.id}
                type="button"
                onClick={() => selectMenu(menu)}
                className={`rounded-md border p-3 text-left transition ${selectedId === menu.id && !creating ? 'border-brand bg-brand/5' : 'border-border hover:bg-surface-subtle'}`}
              >
                <div className="flex items-start gap-2">
                  <Icon icon={MenuIcon} size="inline" className="mt-0.5" />
                  <div className="min-w-0">
                    <Text as="p" variant="body-strong" className="truncate">{menu.title}</Text>
                    <Text as="p" variant="caption" className="text-text-secondary">{menu.handle} · {menu.status}</Text>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {(creating || selected) ? (
          <Card>
            <CardHeader><CardTitle>{creating ? 'New menu draft' : selected?.title}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-5">
              {selected?.isPublished && <Alert variant="success">This menu is live. Saving changes updates only the draft until you Publish changes.</Alert>}

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Menu title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} disabled={!canManage} />
                <Input
                  label="Handle"
                  hint="Use main-navigation for the Storefront header."
                  value={draft.handle}
                  onChange={(event) => setDraft((current) => ({ ...current, handle: normalizeHandle(event.target.value) }))}
                  disabled={!canManage}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <Text as="p" variant="body-strong">Menu items</Text>
                  <Text as="p" variant="caption" className="text-text-secondary">Use relative paths such as /pages/about or full https:// links.</Text>
                </div>
                {canManage && <Button size="sm" variant="secondary" onClick={() => setDraft((current) => ({ ...current, items: [...current.items, newMenuItem()] }))}><Icon icon={Plus} size="inline" /> Add item</Button>}
              </div>

              <div className="flex flex-col gap-3">
                {draft.items.length === 0 && <div className="rounded-md border border-dashed border-border p-6 text-center"><Text variant="body" className="text-text-secondary">No links yet. Add the first menu item.</Text></div>}
                {draft.items.map((item, index) => (
                  <div key={item.id} className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
                    <Input label="Label" value={item.label} onChange={(event) => updateItem(index, { label: event.target.value })} disabled={!canManage} />
                    <Input label="Destination" value={item.href} onChange={(event) => updateItem(index, { href: event.target.value })} disabled={!canManage} />
                    {canManage && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" aria-label="Move item up" disabled={index === 0} onClick={() => moveItem(index, -1)}><Icon icon={ArrowUp} size="inline" /></Button>
                        <Button size="sm" variant="ghost" aria-label="Move item down" disabled={index === draft.items.length - 1} onClick={() => moveItem(index, 1)}><Icon icon={ArrowDown} size="inline" /></Button>
                        <Button size="sm" variant="ghost" aria-label="Remove item" onClick={() => removeItem(index)}><Icon icon={Trash2} size="inline" /></Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {canManage && <Button onClick={() => void save()} loading={saving}>Save draft</Button>}
                {!creating && selected && canPublish && !selected.isPublished && (
                  <Button variant="secondary" onClick={() => void publish()} loading={publishMutation.isPending}>Publish</Button>
                )}
                {!creating && selected && canPublish && selected.isPublished && (
                  <>
                    <Button variant="secondary" onClick={() => void publish()} loading={publishMutation.isPending}>Publish changes</Button>
                    <Button variant="ghost" onClick={() => void unpublish()} loading={unpublishMutation.isPending}>Unpublish</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="py-16 text-center"><Text variant="body" className="text-text-secondary">Select a menu or create a new one.</Text></CardContent></Card>
        )}
      </div>
    </RequirePermission>
  );
}
