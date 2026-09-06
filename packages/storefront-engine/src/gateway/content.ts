import 'server-only';
import { gatewayFetch, type GatewayFetchOptions } from './client.js';
import type { Section } from '../theme/types.js';

export interface PublishedContentPage {
  id: string;
  slug: string;
  title: string;
  locale: string;
  content: Section[];
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
}

export interface PublishedContentMenu {
  id: string;
  handle: string;
  title: string;
  items: Array<{ id: string; label: string; href: string }>;
  publishedAt: string | null;
}

/** Published-only CMS reads. The Gateway itself has no path to drafts. */
export function getContentPages(options: GatewayFetchOptions & { locale?: string } = {}): Promise<PublishedContentPage[]> {
  return gatewayFetch<PublishedContentPage[]>('/v1/content/pages', {
    query: { locale: options.locale },
    revalidateSeconds: 60,
    tags: ['cms'],
    ...options,
  });
}

export function getContentPage(slug: string, options: GatewayFetchOptions & { locale?: string } = {}): Promise<PublishedContentPage> {
  return gatewayFetch<PublishedContentPage>(`/v1/content/pages/${encodeURIComponent(slug)}`, {
    query: { locale: options.locale },
    revalidateSeconds: 60,
    tags: ['cms', `cms:page:${slug}`],
    ...options,
  });
}

export function getContentMenu(handle: string, options: GatewayFetchOptions = {}): Promise<PublishedContentMenu> {
  return gatewayFetch<PublishedContentMenu>(`/v1/content/menus/${encodeURIComponent(handle)}`, {
    revalidateSeconds: 60,
    tags: ['cms', `cms:menu:${handle}`],
    ...options,
  });
}
