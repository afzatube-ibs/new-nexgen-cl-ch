import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, RotateCcw } from 'lucide-react';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Icon, Input, Spinner, Text, Textarea, useToast } from '@nexgen/ui';
import type { CmsPageDTO, SaveCmsPageInput } from '@nexgen/api-client';
import { PageHeader, RequirePermission } from '../../framework/index.js';
import { useAuth } from '../../auth/useAuth.js';
import {
  useCmsPageRevisions,
  useCmsPages,
  useCreateCmsPage,
  useCurrentStore,
  usePublishCmsPage,
  useRestoreCmsRevision,
  useUnpublishCmsPage,
  useUpdateCmsPage,
} from './queries.js';

interface EditorDraft {
  title: string;
  slug: string;
  locale: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
}

const EMPTY_DRAFT: EditorDraft = { title: '', slug: '', locale: 'en', body: '', metaTitle: '', metaDescription: '' };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function draftFromPage(page: CmsPageDTO): EditorDraft {
  const richText = page.content.find((section) => section.type === 'RichText');
  return {
    title: page.title,
    slug: page.slug,
    locale: page.locale,
    body: typeof richText?.configuration.body === 'string' ? richText.configuration.body : '',
    metaTitle: page.metaTitle ?? '',
    metaDescription: page.metaDescription ?? '',
  };
}

function toInput(draft: EditorDraft): SaveCmsPageInput {
  return {
    title: draft.title.trim(),
    slug: draft.slug.trim(),
    locale: draft.locale.trim(),
    content: [
      {
        type: 'RichText',
        key: 'main-content',
        configuration: { heading: draft.title.trim(), body: draft.body },
      },
    ],
    metaTitle: draft.metaTitle.trim() || null,
    metaDescription: draft.metaDescription.trim() || null,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/**
 * MODULE:CMS's first production authoring surface. This intentionally edits
 * a safe RichText page rather than pretending a drag-and-drop visual builder
 * exists. The backend already stores the full Section[] tree, so a later
 * visual editor can expand this same contract without migrating page data.
 */
export function CmsPagesPage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('cms.pages.manage');
  const canPublish = can('cms.pages.publish');

  const storeQuery = useCurrentStore();
  const store = storeQuery.data?.[0];
  const pagesQuery = useCmsPages(store?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<EditorDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  const selected = useMemo(() => pagesQuery.data?.find((page) => page.id === selectedId) ?? null, [pagesQuery.data, selectedId]);
  const revisionsQuery = useCmsPageRevisions(store?.id, selected?.id);
  const createMutation = useCreateCmsPage(store?.id);
  const updateMutation = useUpdateCmsPage(store?.id);
  const publishMutation = usePublishCmsPage(store?.id);
  const unpublishMutation = useUnpublishCmsPage(store?.id);
  const restoreMutation = useRestoreCmsRevision(store?.id);

  useEffect(() => {
    if (!creating && !selectedId && pagesQuery.data?.length) setSelectedId(pagesQuery.data[0]?.id ?? null);
  }, [creating, pagesQuery.data, selectedId]);

  useEffect(() => {
    if (creating) {
      setDraft({ ...EMPTY_DRAFT, locale: store?.locale ?? 'en' });
      return;
    }
    if (selected) setDraft(draftFromPage(selected));
  }, [creating, selected, store?.locale]);

  function update<K extends keyof EditorDraft>(key: K, value: EditorDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function beginCreate() {
    setCreating(true);
    setSelectedId(null);
    setFormError(null);
  }

  function selectPage(page: CmsPageDTO) {
    setCreating(false);
    setSelectedId(page.id);
    setFormError(null);
  }

  async function save() {
    if (!store) return;
    setFormError(null);
    if (!draft.title.trim() || !draft.slug.trim() || !draft.body.trim()) {
      setFormError('Title, URL slug, and page content are required.');
      return;
    }

    try {
      if (creating) {
        const page = await createMutation.mutateAsync(toInput(draft));
        setCreating(false);
        setSelectedId(page.id);
        toast({ variant: 'success', title: 'Draft created', description: 'Publish it when it is ready for customers.' });
      } else if (selected) {
        await updateMutation.mutateAsync({ pageId: selected.id, input: toInput(draft), expectedVersion: selected.lockVersion });
        toast({ variant: 'success', title: 'Draft saved' });
      }
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function publish() {
    if (!selected) return;
    setFormError(null);
    try {
      await publishMutation.mutateAsync({ pageId: selected.id, expectedVersion: selected.lockVersion });
      toast({ variant: 'success', title: 'Page published', description: `Customers can now open /pages/${selected.slug}.` });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function unpublish() {
    if (!selected) return;
    setFormError(null);
    try {
      await unpublishMutation.mutateAsync({ pageId: selected.id, expectedVersion: selected.lockVersion });
      toast({ variant: 'success', title: 'Page unpublished' });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function restore(revisionId: string) {
    if (!selected) return;
    setFormError(null);
    try {
      const restored = await restoreMutation.mutateAsync({ pageId: selected.id, revisionId, expectedVersion: selected.lockVersion });
      setDraft(draftFromPage(restored));
      toast({ variant: 'success', title: 'Revision restored', description: 'The restored version is a draft. Publish when ready.' });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  if (storeQuery.isLoading || pagesQuery.isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner /></div>;
  }

  if (!store) {
    return <Alert variant="warning" title="No store configured">Create the store first, then add customer-facing content.</Alert>;
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <RequirePermission anyOf={['cms.pages.view']}>
      <PageHeader
        title="Pages"
        description="Create and publish customer-facing About, Contact, Privacy, Terms, Shipping, Return, and other store pages."
        actions={canManage ? <Button onClick={beginCreate}><Icon icon={Plus} size="inline" /> New page</Button> : undefined}
      />

      {formError && <Alert variant="danger" className="mb-6" role="alert">{formError}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Store pages</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(pagesQuery.data ?? []).length === 0 && !creating && <Text variant="body" className="text-text-secondary">No pages yet.</Text>}
            {(pagesQuery.data ?? []).map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => selectPage(page)}
                className={`rounded-md border p-3 text-left transition ${selectedId === page.id && !creating ? 'border-brand bg-brand/5' : 'border-border hover:bg-surface-subtle'}`}
              >
                <div className="flex items-start gap-2">
                  <Icon icon={FileText} size="inline" className="mt-0.5" />
                  <div className="min-w-0">
                    <Text as="p" variant="body-strong" className="truncate">{page.title}</Text>
                    <Text as="p" variant="caption" className="text-text-secondary">/pages/{page.slug} · {page.status}</Text>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {(creating || selected) ? (
            <>
              <Card>
                <CardHeader><CardTitle>{creating ? 'New page draft' : selected?.title}</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {selected?.isPublished && (
                    <Alert variant="success">This page is live. Saving changes updates only the draft until you Publish again.</Alert>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Page title"
                      value={draft.title}
                      onChange={(event) => {
                        const value = event.target.value;
                        update('title', value);
                        if (creating && (!draft.slug || draft.slug === slugify(draft.title))) update('slug', slugify(value));
                      }}
                      disabled={!canManage}
                    />
                    <Input label="URL slug" hint="Example: privacy-policy" value={draft.slug} onChange={(event) => update('slug', slugify(event.target.value))} disabled={!canManage} />
                  </div>
                  <Input label="Locale" value={draft.locale} onChange={(event) => update('locale', event.target.value)} disabled={!canManage} />
                  <Textarea label="Page content" rows={14} value={draft.body} onChange={(event) => update('body', event.target.value)} disabled={!canManage} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="SEO title" value={draft.metaTitle} onChange={(event) => update('metaTitle', event.target.value)} disabled={!canManage} />
                    <Textarea label="SEO description" rows={3} value={draft.metaDescription} onChange={(event) => update('metaDescription', event.target.value)} disabled={!canManage} />
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

              {!creating && selected && (
                <Card>
                  <CardHeader><CardTitle>Revision history</CardTitle></CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {revisionsQuery.isLoading && <Spinner />}
                    {(revisionsQuery.data ?? []).slice(0, 12).map((revision) => (
                      <div key={revision.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                        <div>
                          <Text as="p" variant="body-strong">{revision.snapshot.title || selected.title}</Text>
                          <Text as="p" variant="caption" className="text-text-secondary">{revision.createdAt ? new Date(revision.createdAt).toLocaleString() : 'Saved revision'}</Text>
                        </div>
                        {canManage && <Button size="sm" variant="ghost" onClick={() => void restore(revision.id)} loading={restoreMutation.isPending}><Icon icon={RotateCcw} size="inline" /> Restore</Button>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="py-16 text-center"><Text variant="body" className="text-text-secondary">Select a page or create a new one.</Text></CardContent></Card>
          )}
        </div>
      </div>
    </RequirePermission>
  );
}
