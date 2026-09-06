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

export interface CmsMenuItemDTO {
  id: string;
  label: string;
  href: string;
}

export interface CmsMenuDTO {
  id: string;
  storeId: string;
  handle: string;
  title: string;
  items: CmsMenuItemDTO[];
  status: 'draft' | 'published';
  isPublished: boolean;
  publishedAt: string | null;
  lockVersion: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SaveCmsMenuInput {
  handle: string;
  title: string;
  items: CmsMenuItemDTO[];
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
  const response = await client.post<DataEnvelope<CmsPageDTO>>(`/stores/${storeId}/cms/pages/${pageId}/revisions/${revisionId}/restore`, { expected_version: expectedVersion });
  return response.data;
}

export async function listCmsMenus(client: ApiClient, storeId: string): Promise<CmsMenuDTO[]> {
  const response = await client.get<DataEnvelope<CmsMenuDTO[]>>(`/stores/${storeId}/cms/menus`);
  return response.data;
}

export async function createCmsMenu(client: ApiClient, storeId: string, input: SaveCmsMenuInput): Promise<CmsMenuDTO> {
  const response = await client.post<DataEnvelope<CmsMenuDTO>>(`/stores/${storeId}/cms/menus`, input);
  return response.data;
}

export async function updateCmsMenu(client: ApiClient, storeId: string, menuId: string, input: Partial<SaveCmsMenuInput>, expectedVersion: number): Promise<CmsMenuDTO> {
  const response = await client.patch<DataEnvelope<CmsMenuDTO>>(`/stores/${storeId}/cms/menus/${menuId}`, { ...input, expected_version: expectedVersion });
  return response.data;
}

export async function publishCmsMenu(client: ApiClient, storeId: string, menuId: string, expectedVersion: number): Promise<CmsMenuDTO> {
  const response = await client.post<DataEnvelope<CmsMenuDTO>>(`/stores/${storeId}/cms/menus/${menuId}/publish`, { expected_version: expectedVersion });
  return response.data;
}

export async function unpublishCmsMenu(client: ApiClient, storeId: string, menuId: string, expectedVersion: number): Promise<CmsMenuDTO> {
  const response = await client.post<DataEnvelope<CmsMenuDTO>>(`/stores/${storeId}/cms/menus/${menuId}/unpublish`, { expected_version: expectedVersion });
  return response.data;
}
