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
