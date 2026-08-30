import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { LocaleDTO, ListLocalizationQuery, CreateLocaleInput, UpdateLocaleInput, LocalizationExpectedVersionInput } from './types.js';

/** `apps/backend/.../Localization/routes.php` — `locales`, `localization.locales.view`/`.manage`. */
const BASE_PATH = '/locales';

export function listLocales(client: ApiClient, query?: ListLocalizationQuery): Promise<ListEnvelope<LocaleDTO>> {
  return client.get<ListEnvelope<LocaleDTO>>(BASE_PATH, { query: query && { status: query.status, page: query.page } });
}

export function getLocale(client: ApiClient, id: string): Promise<LocaleDTO> {
  return client.get<DataEnvelope<LocaleDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

export function createLocale(client: ApiClient, input: CreateLocaleInput): Promise<LocaleDTO> {
  return client
    .post<DataEnvelope<LocaleDTO>>(BASE_PATH, {
      code: input.code,
      name: input.name,
      native_name: input.nativeName,
      is_rtl: input.isRtl,
    })
    .then((r) => r.data);
}

export function updateLocale(client: ApiClient, id: string, input: UpdateLocaleInput): Promise<LocaleDTO> {
  return client
    .patch<DataEnvelope<LocaleDTO>>(`${BASE_PATH}/${id}`, {
      code: input.code,
      name: input.name,
      native_name: input.nativeName,
      is_rtl: input.isRtl,
      is_default: input.isDefault,
      expected_version: input.expectedVersion,
    })
    .then((r) => r.data);
}

export function archiveLocale(client: ApiClient, id: string, input: LocalizationExpectedVersionInput): Promise<LocaleDTO> {
  return client.post<DataEnvelope<LocaleDTO>>(`${BASE_PATH}/${id}/archive`, { expected_version: input.expectedVersion }).then((r) => r.data);
}

export function deleteLocale(client: ApiClient, id: string, input: LocalizationExpectedVersionInput): Promise<void> {
  return client.delete<void>(`${BASE_PATH}/${id}`, { expected_version: input.expectedVersion });
}
