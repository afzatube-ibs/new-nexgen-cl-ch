import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { CurrencyDTO, ListLocalizationQuery, CreateCurrencyInput, UpdateCurrencyInput, LocalizationExpectedVersionInput } from './types.js';

/** `apps/backend/.../Localization/routes.php` — `currencies`, `localization.currencies.view`/`.manage`. */
const BASE_PATH = '/currencies';

export function listCurrencies(client: ApiClient, query?: ListLocalizationQuery): Promise<ListEnvelope<CurrencyDTO>> {
  return client.get<ListEnvelope<CurrencyDTO>>(BASE_PATH, { query: query && { status: query.status, page: query.page } });
}

export function getCurrency(client: ApiClient, id: string): Promise<CurrencyDTO> {
  return client.get<DataEnvelope<CurrencyDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

export function createCurrency(client: ApiClient, input: CreateCurrencyInput): Promise<CurrencyDTO> {
  return client
    .post<DataEnvelope<CurrencyDTO>>(BASE_PATH, {
      code: input.code,
      name: input.name,
      symbol: input.symbol,
      decimal_places: input.decimalPlaces,
      exchange_rate: input.exchangeRate,
    })
    .then((r) => r.data);
}

export function updateCurrency(client: ApiClient, id: string, input: UpdateCurrencyInput): Promise<CurrencyDTO> {
  return client
    .patch<DataEnvelope<CurrencyDTO>>(`${BASE_PATH}/${id}`, {
      code: input.code,
      name: input.name,
      symbol: input.symbol,
      decimal_places: input.decimalPlaces,
      exchange_rate: input.exchangeRate,
      is_base: input.isBase,
      expected_version: input.expectedVersion,
    })
    .then((r) => r.data);
}

export function archiveCurrency(client: ApiClient, id: string, input: LocalizationExpectedVersionInput): Promise<CurrencyDTO> {
  return client.post<DataEnvelope<CurrencyDTO>>(`${BASE_PATH}/${id}/archive`, { expected_version: input.expectedVersion }).then((r) => r.data);
}

export function deleteCurrency(client: ApiClient, id: string, input: LocalizationExpectedVersionInput): Promise<void> {
  return client.delete<void>(`${BASE_PATH}/${id}`, { expected_version: input.expectedVersion });
}
