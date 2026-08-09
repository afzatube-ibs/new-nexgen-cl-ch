import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient, type ListQuery } from './resourceClient.js';
import type { BrandDTO, CreateBrandInput, UpdateBrandInput } from './types.js';

/** `apps/backend/.../Catalog/routes.php` — `brands`, `catalog.brands.{view|manage}`. */
const BASE_PATH = '/brands';

function toCreateBody(input: CreateBrandInput): Record<string, unknown> {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    meta_title: input.metaTitle,
    meta_description: input.metaDescription,
  };
}

function toUpdateBody(input: UpdateBrandInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { ...toCreateBody(rest as CreateBrandInput), expected_version: expectedVersion };
}

export function listBrands(client: ApiClient, query?: ListQuery): Promise<ListEnvelope<BrandDTO>> {
  return createResourceClient<BrandDTO>(client, BASE_PATH).list(query);
}

export function getBrand(client: ApiClient, id: string): Promise<BrandDTO> {
  return createResourceClient<BrandDTO>(client, BASE_PATH).get(id);
}

export function createBrand(client: ApiClient, input: CreateBrandInput): Promise<BrandDTO> {
  return createResourceClient<BrandDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateBrand(client: ApiClient, id: string, input: UpdateBrandInput): Promise<BrandDTO> {
  return createResourceClient<BrandDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archiveBrand(client: ApiClient, id: string, expectedVersion: number): Promise<BrandDTO> {
  return createResourceClient<BrandDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyBrand(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<BrandDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}

export function restoreBrand(client: ApiClient, id: string): Promise<BrandDTO> {
  return createResourceClient<BrandDTO>(client, BASE_PATH).restore(id);
}
