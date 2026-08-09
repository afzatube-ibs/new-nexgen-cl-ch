import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient, type ListQuery } from './resourceClient.js';
import type { TagDTO, CreateTagInput, UpdateTagInput } from './types.js';

/** `apps/backend/.../Catalog/routes.php` — `tags`, `catalog.tags.{view|manage}`. No `status` column, so no archive route — `destroy`/`restore` only. */
const BASE_PATH = '/tags';

function toCreateBody(input: CreateTagInput): Record<string, unknown> {
  return { name: input.name, slug: input.slug };
}

function toUpdateBody(input: UpdateTagInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { ...toCreateBody(rest as CreateTagInput), expected_version: expectedVersion };
}

export function listTags(client: ApiClient, query?: ListQuery): Promise<ListEnvelope<TagDTO>> {
  return createResourceClient<TagDTO>(client, BASE_PATH).list(query);
}

export function getTag(client: ApiClient, id: string): Promise<TagDTO> {
  return createResourceClient<TagDTO>(client, BASE_PATH).get(id);
}

export function createTag(client: ApiClient, input: CreateTagInput): Promise<TagDTO> {
  return createResourceClient<TagDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateTag(client: ApiClient, id: string, input: UpdateTagInput): Promise<TagDTO> {
  return createResourceClient<TagDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function destroyTag(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<TagDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}

export function restoreTag(client: ApiClient, id: string): Promise<TagDTO> {
  return createResourceClient<TagDTO>(client, BASE_PATH).restore(id);
}
