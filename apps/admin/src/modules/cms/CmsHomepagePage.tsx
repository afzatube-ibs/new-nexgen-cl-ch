import { useEffect, useMemo, useState } from 'react';
import { Home } from 'lucide-react';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Icon, Input, Spinner, Text, Textarea, useToast } from '@nexgen/ui';
import type { CmsPageDTO, CmsSectionDTO, SaveCmsPageInput } from '@nexgen/api-client';
import { PageHeader, RequirePermission } from '../../framework/index.js';
import { useAuth } from '../../auth/useAuth.js';
import { useCmsPages, useCreateCmsPage, useCurrentStore, usePublishCmsPage, useUnpublishCmsPage, useUpdateCmsPage } from './queries.js';

interface HomepageDraft {
  heroHeading: string;
  heroSubheading: string;
  heroCtaLabel: string;
  featuredHeading: string;
  categoriesHeading: string;
  trendingHeading: string;
  recentlyAddedHeading: string;
  brandsHeading: string;
  showFeatured: boolean;
  showCategories: boolean;
  showTrending: boolean;
  showRecentlyAdded: boolean;
  showBrands: boolean;
  metaTitle: string;
  metaDescription: string;
}

const DEFAULT_DRAFT: HomepageDraft = {
  heroHeading: '',
  heroSubheading: 'Browse our latest products and collections.',
  heroCtaLabel: 'Shop now',
  featuredHeading: 'Featured products',
  categoriesHeading: 'Shop by category',
  trendingHeading: 'Trending now',
  recentlyAddedHeading: 'Recently added',
  brandsHeading: 'Shop by brand',
  showFeatured: true,
  showCategories: true,
  showTrending: true,
  showRecentlyAdded: true,
  showBrands: true,
  metaTitle: '',
  metaDescription: '',
};

function section(page: CmsPageDTO, key: string): CmsSectionDTO | undefined {
  return page.content.find((item) => item.key === key);
}

function stringConfig(item: CmsSectionDTO | undefined, key: string, fallback: string): string {
  const value = item?.configuration[key];
  return typeof value === 'string' ? value : fallback;
}

function draftFromPage(page: CmsPageDTO, storeName: string): HomepageDraft {
  const hero = section(page, 'hero');
  const cta = hero?.configuration.cta;
  const ctaLabel = typeof cta === 'object' && cta !== null && 'label' in cta && typeof cta.label === 'string' ? cta.label : 'Shop now';
  return {
    heroHeading: stringConfig(hero, 'heading', storeName),
    heroSubheading: stringConfig(hero, 'subheading', DEFAULT_DRAFT.heroSubheading),
    heroCtaLabel: ctaLabel,
    featuredHeading: stringConfig(section(page, 'featured-products'), 'heading', DEFAULT_DRAFT.featuredHeading),
    categoriesHeading: stringConfig(section(page, 'category-grid'), 'heading', DEFAULT_DRAFT.categoriesHeading),
    trendingHeading: stringConfig(section(page, 'trending-products'), 'heading', DEFAULT_DRAFT.trendingHeading),
    recentlyAddedHeading: stringConfig(section(page, 'recently-added'), 'heading', DEFAULT_DRAFT.recentlyAddedHeading),
    brandsHeading: stringConfig(section(page, 'brand-slider'), 'heading', DEFAULT_DRAFT.brandsHeading),
    showFeatured: Boolean(section(page, 'featured-products')),
    showCategories: Boolean(section(page, 'category-grid')),
    showTrending: Boolean(section(page, 'trending-products')),
    showRecentlyAdded: Boolean(section(page, 'recently-added')),
    showBrands: Boolean(section(page, 'brand-slider')),
    metaTitle: page.metaTitle ?? '',
    metaDescription: page.metaDescription ?? '',
  };
}

function buildSections(draft: HomepageDraft): CmsSectionDTO[] {
  const sections: CmsSectionDTO[] = [
    {
      type: 'Hero',
      key: 'hero',
      configuration: {
        heading: draft.heroHeading.trim(),
        subheading: draft.heroSubheading.trim(),
        cta: { label: draft.heroCtaLabel.trim() || 'Shop now', href: '#featured-products' },
      },
    },
  ];
  if (draft.showFeatured) sections.push({ type: 'ProductGrid', key: 'featured-products', configuration: { heading: draft.featuredHeading.trim() || 'Featured products' } });
  if (draft.showCategories) sections.push({ type: 'CategoryGrid', key: 'category-grid', configuration: { heading: draft.categoriesHeading.trim() || 'Shop by category' } });
  if (draft.showTrending) sections.push({ type: 'ProductGrid', key: 'trending-products', configuration: { heading: draft.trendingHeading.trim() || 'Trending now' } });
  if (draft.showRecentlyAdded) sections.push({ type: 'ProductGrid', key: 'recently-added', configuration: { heading: draft.recentlyAddedHeading.trim() || 'Recently added' } });
  if (draft.showBrands) sections.push({ type: 'BrandSlider', key: 'brand-slider', configuration: { heading: draft.brandsHeading.trim() || 'Shop by brand' } });
  return sections;
}

function pageInput(draft: HomepageDraft, locale: string): SaveCmsPageInput {
  return {
    slug: 'home',
    title: 'Homepage',
    locale,
    content: buildSections(draft),
    metaTitle: draft.metaTitle.trim() || null,
    metaDescription: draft.metaDescription.trim() || null,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function CmsHomepagePage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('cms.pages.manage');
  const canPublish = can('cms.pages.publish');
  const storeQuery = useCurrentStore();
  const store = storeQuery.data?.[0];
  const pagesQuery = useCmsPages(store?.id);
  const homePage = useMemo(() => pagesQuery.data?.find((page) => page.slug === 'home') ?? null, [pagesQuery.data]);
  const createMutation = useCreateCmsPage(store?.id);
  const updateMutation = useUpdateCmsPage(store?.id);
  const publishMutation = usePublishCmsPage(store?.id);
  const unpublishMutation = useUnpublishCmsPage(store?.id);
  const [draft, setDraft] = useState<HomepageDraft>(DEFAULT_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!store) return;
    setDraft(homePage ? draftFromPage(homePage, store.name) : { ...DEFAULT_DRAFT, heroHeading: store.name });
  }, [homePage, store]);

  function update<K extends keyof HomepageDraft>(key: K, value: HomepageDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveDraft() {
    if (!store) return;
    setFormError(null);
    if (!draft.heroHeading.trim()) {
      setFormError('Hero heading is required.');
      return;
    }
    try {
      if (homePage) {
        await updateMutation.mutateAsync({ pageId: homePage.id, input: pageInput(draft, homePage.locale), expectedVersion: homePage.lockVersion });
      } else {
        await createMutation.mutateAsync(pageInput(draft, store.locale));
      }
      toast({ variant: 'success', title: 'Homepage draft saved', description: 'Publish when you are ready for customers to see it.' });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function publish() {
    if (!homePage) {
      setFormError('Save the homepage draft before publishing.');
      return;
    }
    setFormError(null);
    try {
      await publishMutation.mutateAsync({ pageId: homePage.id, expectedVersion: homePage.lockVersion });
      toast({ variant: 'success', title: 'Homepage published', description: 'The Storefront is now using this homepage configuration.' });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function unpublish() {
    if (!homePage) return;
    setFormError(null);
    try {
      await unpublishMutation.mutateAsync({ pageId: homePage.id, expectedVersion: homePage.lockVersion });
      toast({ variant: 'success', title: 'Homepage unpublished', description: 'The Storefront has returned to its safe default homepage.' });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  if (storeQuery.isLoading || pagesQuery.isLoading) return <div className="flex items-center justify-center py-24"><Spinner /></div>;
  if (!store) return <Alert variant="warning" title="No store configured">Create the store first, then configure the homepage.</Alert>;

  const saving = createMutation.isPending || updateMutation.isPending;
  const toggleRows: Array<{ key: keyof HomepageDraft; headingKey: keyof HomepageDraft; label: string }> = [
    { key: 'showFeatured', headingKey: 'featuredHeading', label: 'Featured products' },
    { key: 'showCategories', headingKey: 'categoriesHeading', label: 'Categories' },
    { key: 'showTrending', headingKey: 'trendingHeading', label: 'Trending products' },
    { key: 'showRecentlyAdded', headingKey: 'recentlyAddedHeading', label: 'Recently added' },
    { key: 'showBrands', headingKey: 'brandsHeading', label: 'Brands' },
  ];

  return (
    <RequirePermission anyOf={['cms.pages.view']}>
      <PageHeader
        title="Homepage"
        description="Control the customer-facing homepage using real catalog sections and your own store copy."
        actions={canManage ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void saveDraft()} loading={saving}>Save draft</Button>
            {canPublish && homePage && <Button onClick={() => void publish()} loading={publishMutation.isPending}>{homePage.isPublished ? 'Publish changes' : 'Publish'}</Button>}
          </div>
        ) : undefined}
      />

      {formError && <Alert variant="danger" className="mb-6" role="alert">{formError}</Alert>}
      {homePage?.isPublished && <Alert variant="success" className="mb-6">The homepage is live. Saving changes affects only the draft until you publish again.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-center gap-2"><Icon icon={Home} className="text-brand" /><CardTitle>Hero</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Headline" value={draft.heroHeading} onChange={(event) => update('heroHeading', event.target.value)} disabled={!canManage} />
              <Textarea label="Supporting text" rows={3} value={draft.heroSubheading} onChange={(event) => update('heroSubheading', event.target.value)} disabled={!canManage} />
              <Input label="Button label" value={draft.heroCtaLabel} onChange={(event) => update('heroCtaLabel', event.target.value)} disabled={!canManage} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Homepage sections</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {toggleRows.map((row) => {
                const enabled = Boolean(draft[row.key]);
                const heading = String(draft[row.headingKey] ?? '');
                return (
                  <div key={String(row.key)} className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                    <label className="flex items-center gap-2 text-body-strong text-text-primary">
                      <input type="checkbox" checked={enabled} onChange={(event) => update(row.key, event.target.checked as never)} disabled={!canManage} />
                      {row.label}
                    </label>
                    <Input label="Section heading" value={heading} onChange={(event) => update(row.headingKey, event.target.value as never)} disabled={!canManage || !enabled} />
                  </div>
                );
              })}
              <Text variant="caption" className="text-text-secondary">Sections use live neXgen catalog/recommendation data. This editor controls visibility, order preset, and merchant-facing headings without duplicating product data into CMS.</Text>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Search appearance</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Input label="SEO title" value={draft.metaTitle} onChange={(event) => update('metaTitle', event.target.value)} disabled={!canManage} />
              <Textarea label="SEO description" rows={3} value={draft.metaDescription} onChange={(event) => update('metaDescription', event.target.value)} disabled={!canManage} />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle>Publishing</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Text variant="body">Status: <strong>{homePage?.isPublished ? 'Published' : 'Draft / default storefront'}</strong></Text>
            <Text variant="caption" className="text-text-secondary">The live Storefront reads only the published CMS snapshot. Draft edits are never exposed.</Text>
            {canManage && <Button variant="secondary" onClick={() => void saveDraft()} loading={saving}>Save draft</Button>}
            {canPublish && homePage && <Button onClick={() => void publish()} loading={publishMutation.isPending}>{homePage.isPublished ? 'Publish changes' : 'Publish homepage'}</Button>}
            {canPublish && homePage?.isPublished && <Button variant="ghost" onClick={() => void unpublish()} loading={unpublishMutation.isPending}>Unpublish homepage</Button>}
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  );
}
