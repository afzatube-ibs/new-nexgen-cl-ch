import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient, type ListQuery } from './resourceClient.js';
import type { CategoryDTO, CreateCategoryInput, UpdateCategoryInput } from './types.js';

/** `apps/backend/.../Catalog/routes.php` — `categories`, `catalog.categories.{view|manage}`. */
const BASE_PATH = '/categories';

function toCreateBody(input: CreateCategoryInput): Record<string, unknown> {
  return {
    parent_id: input.parentId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    position: input.position,
    meta_title: input.metaTitle,
    meta_description: input.metaDescription,
  };
}

function toUpdateBody(input: UpdateCategoryInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { ...toCreateBody(rest as CreateCategoryInput), expected_version: expectedVersion };
}

export function listCategories(client: ApiClient, query?: ListQuery): Promise<ListEnvelope<CategoryDTO>> {
  return createResourceClient<CategoryDTO>(client, BASE_PATH).list(query);
}

export function getCategory(client: ApiClient, id: string): Promise<CategoryDTO> {
  return createResourceClient<CategoryDTO>(client, BASE_PATH).get(id);
}

export function createCategory(client: ApiClient, input: CreateCategoryInput): Promise<CategoryDTO> {
  return createResourceClient<CategoryDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateCategory(client: ApiClient, id: string, input: UpdateCategoryInput): Promise<CategoryDTO> {
  return createResourceClient<CategoryDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archiveCategory(client: ApiClient, id: string, expectedVersion: number): Promise<CategoryDTO> {
  return createResourceClient<CategoryDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyCategory(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<CategoryDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}

export function restoreCategory(client: ApiClient, id: string): Promise<CategoryDTO> {
  return createResourceClient<CategoryDTO>(client, BASE_PATH).restore(id);
}
