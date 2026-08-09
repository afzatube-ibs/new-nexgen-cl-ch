import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import { createResourceClient, type ListQuery } from './resourceClient.js';
import type { OptionDTO, OptionValueDTO, CreateOptionInput, UpdateOptionInput, AddOptionValueInput, UpdateOptionValueInput } from './types.js';

/** `apps/backend/.../Catalog/routes.php` — `options` (+ nested `options/{option}/values`), `catalog.options.{view|manage}`. No archive route on Options themselves. */
const BASE_PATH = '/options';

function toCreateBody(input: CreateOptionInput): Record<string, unknown> {
  return { code: input.code, name: input.name, position: input.position };
}

function toUpdateBody(input: UpdateOptionInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { ...toCreateBody(rest as CreateOptionInput), expected_version: expectedVersion };
}

export function listOptions(client: ApiClient, query?: ListQuery): Promise<ListEnvelope<OptionDTO>> {
  return createResourceClient<OptionDTO>(client, BASE_PATH).list(query);
}

/** Eager-loads `values` (`OptionController::show`) — the source of truth for `OptionValuesManager`. */
export function getOption(client: ApiClient, id: string): Promise<OptionDTO> {
  return createResourceClient<OptionDTO>(client, BASE_PATH).get(id);
}

export function createOption(client: ApiClient, input: CreateOptionInput): Promise<OptionDTO> {
  return createResourceClient<OptionDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updateOption(client: ApiClient, id: string, input: UpdateOptionInput): Promise<OptionDTO> {
  return createResourceClient<OptionDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function destroyOption(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<OptionDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}

export function restoreOption(client: ApiClient, id: string): Promise<OptionDTO> {
  return createResourceClient<OptionDTO>(client, BASE_PATH).restore(id);
}

/** `POST /options/{option}/values` — `AddOptionValueRequest` (`value`, `expected_option_version` — the *Option's* version, since values have no lock of their own). */
export async function addOptionValue(client: ApiClient, optionId: string, input: AddOptionValueInput): Promise<OptionValueDTO> {
  const response = await client.post<DataEnvelope<OptionValueDTO>>(`${BASE_PATH}/${optionId}/values`, {
    value: input.value,
    expected_option_version: input.expectedOptionVersion,
  });
  return response.data;
}

/** `PATCH /options/{option}/values/{value}` — `UpdateOptionValueRequest`. */
export async function updateOptionValue(
  client: ApiClient,
  optionId: string,
  valueId: string,
  input: UpdateOptionValueInput,
): Promise<OptionValueDTO> {
  const response = await client.patch<DataEnvelope<OptionValueDTO>>(`${BASE_PATH}/${optionId}/values/${valueId}`, {
    value: input.value,
    expected_option_version: input.expectedOptionVersion,
  });
  return response.data;
}

/** `DELETE /options/{option}/values/{value}` — `RemoveOptionValueRequest` (`expected_option_version` only). */
export function removeOptionValue(client: ApiClient, optionId: string, valueId: string, expectedOptionVersion: number): Promise<void> {
  return client.delete<void>(`${BASE_PATH}/${optionId}/values/${valueId}`, { expected_option_version: expectedOptionVersion });
}
