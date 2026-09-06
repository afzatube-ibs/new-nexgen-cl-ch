import type { ApiClient } from './client.js';
import type { DataEnvelope } from './types.js';

export interface CmsSectionDTO {
  type: string;
  configuration: Record<string, unknown>;
  key?: string | null;
}

export interface CmsPageDTO {
  id: string;
  storeId: string;
  slug: string;
  title: string;
  locale: string;
  content: CmsSectionDTO[];
  metaTitle: string | null;
  metaDescription: string | null;
  status: 'draft' | 'published';
  isPublished: boolean;
  publishedAt: string | null;
  lockVersion: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CmsPageRevisionDTO {
  id: string;
  pageId: string;
  snapshot: {
    slug: string;
    title: string;
    locale: string;
    content: CmsSectionDTO[];
    meta_title?: string | null;
    meta_description?: string | null;
  };
  createdBy: string | null;
  createdAt: string | null;
}

export interface SaveCmsPageInput {
  slug: string;
  title: string;
  locale: string;
  content: CmsSectionDTO[];
  metaTitle?: string | null;
  metaDescription?: string | null;
}

function toWire(input: Partial<SaveCmsPageInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.title !== undefined) payload.title = input.title;
  if (input.locale !== undefined) payload.locale = input.locale;
  if (input.content !== undefined) payload.content = input.content;
  if (input.metaTitle !== undefined) payload.meta_title = input.metaTitle;
  if (input.metaDescription !== undefined) payload.meta_description = input.metaDescription;
  return payload;
}

export async function listCmsPages(client: ApiClient, storeId: string): Promise<CmsPageDTO[]> {
  const response = await client.get<DataEnvelope<CmsPageDTO[]>>(`/stores/${storeId}/cms/pages`);
  return response.data;
}

export async function createCmsPage(client: ApiClient, storeId: string, input: SaveCmsPageInput): Promise<CmsPageDTO> {
  const response = await client.post<DataEnvelope<CmsPageDTO>>(`/stores/${storeId}/cms/pages`, toWire(input));
  return response.data;
}

export async function updateCmsPage(client: ApiClient, storeId: string, pageId: string, input: Partial<SaveCmsPageInput>, expectedVersion: number): Promise<CmsPageDTO> {
  const response = await client.patch<DataEnvelope<CmsPageDTO>>(`/stores/${storeId}/cms/pages/${pageId}`, {
    ...toWire(input),
    expected_version: expectedVersion,
  });
  return response.data;
}

export async function publishCmsPage(client: ApiClient, storeId: string, pageId: string, expectedVersion: number): Promise<CmsPageDTO> {
  const response = await client.post<DataEnvelope<CmsPageDTO>>(`/stores/${storeId}/cms/pages/${pageId}/publish`, { expected_version: expectedVersion });
  return response.data;
}

export async function unpublishCmsPage(client: ApiClient, storeId: string, pageId: string, expectedVersion: number): Promise<CmsPageDTO> {
  const response = await client.post<DataEnvelope<CmsPageDTO>>(`/stores/${storeId}/cms/pages/${pageId}/unpublish`, { expected_version: expectedVersion });
  return response.data;
}

export async function listCmsPageRevisions(client: ApiClient, storeId: string, pageId: string): Promise<CmsPageRevisionDTO[]> {
  const response = await client.get<DataEnvelope<CmsPageRevisionDTO[]>>(`/stores/${storeId}/cms/pages/${pageId}/revisions`);
  return response.data;
}

export async function restoreCmsPageRevision(client: ApiClient, storeId: string, pageId: string, revisionId: string, expectedVersion: number): Promise<CmsPageDTO> {
  const response = await client.post<DataEnvelope<CmsPageDTO>>(`/stores/${storeId}/cms/pages/${pageId}/revisions/${revisionId}/restore`, {
    expected_version: expectedVersion,
  });
  return response.data;
}
