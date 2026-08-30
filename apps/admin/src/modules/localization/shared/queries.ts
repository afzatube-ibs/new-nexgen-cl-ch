import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listCurrencies,
  createCurrency,
  updateCurrency,
  archiveCurrency,
  deleteCurrency,
  listLocales,
  createLocale,
  updateLocale,
  archiveLocale,
  deleteLocale,
  listStores,
  updateStore,
  type CurrencyDTO,
  type LocaleDTO,
  type ListLocalizationQuery,
  type CreateCurrencyInput,
  type UpdateCurrencyInput,
  type LocalizationExpectedVersionInput,
  type CreateLocaleInput,
  type UpdateLocaleInput,
  type StoreDTO,
  type UpdateStoreInput,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

const CURRENCIES_KEY = 'localization-currencies';
const LOCALES_KEY = 'localization-locales';

export function useCurrencies(query?: ListLocalizationQuery): UseQueryResult<ListEnvelope<CurrencyDTO>> {
  return useQuery({ queryKey: [CURRENCIES_KEY, query], queryFn: () => listCurrencies(apiClient, query) });
}

export function useCreateCurrency(): UseMutationResult<CurrencyDTO, unknown, CreateCurrencyInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => createCurrency(apiClient, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [CURRENCIES_KEY] }),
  });
}

export function useUpdateCurrency(): UseMutationResult<CurrencyDTO, unknown, { id: string; input: UpdateCurrencyInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateCurrency(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [CURRENCIES_KEY] }),
  });
}

export function useArchiveCurrency(): UseMutationResult<CurrencyDTO, unknown, { id: string; input: LocalizationExpectedVersionInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => archiveCurrency(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [CURRENCIES_KEY] }),
  });
}

export function useDeleteCurrency(): UseMutationResult<void, unknown, { id: string; input: LocalizationExpectedVersionInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => deleteCurrency(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [CURRENCIES_KEY] }),
  });
}

export function useLocales(query?: ListLocalizationQuery): UseQueryResult<ListEnvelope<LocaleDTO>> {
  return useQuery({ queryKey: [LOCALES_KEY, query], queryFn: () => listLocales(apiClient, query) });
}

export function useCreateLocale(): UseMutationResult<LocaleDTO, unknown, CreateLocaleInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => createLocale(apiClient, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [LOCALES_KEY] }),
  });
}

export function useUpdateLocale(): UseMutationResult<LocaleDTO, unknown, { id: string; input: UpdateLocaleInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateLocale(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [LOCALES_KEY] }),
  });
}

export function useArchiveLocale(): UseMutationResult<LocaleDTO, unknown, { id: string; input: LocalizationExpectedVersionInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => archiveLocale(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [LOCALES_KEY] }),
  });
}

export function useDeleteLocale(): UseMutationResult<void, unknown, { id: string; input: LocalizationExpectedVersionInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => deleteLocale(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [LOCALES_KEY] }),
  });
}

/**
 * The one real Store this installation has — mirrors Appearance's own
 * `useCurrentStore`/`useUpdateStore` exactly (a separate copy, per this
 * codebase's established "each module owns its own small query hooks"
 * convention: Admin modules are self-contained, never importing another
 * module's own private query layer directly).
 */
export function useCurrentStore(): UseQueryResult<StoreDTO[]> {
  return useQuery({ queryKey: ['localization-current-store'], queryFn: () => listStores(apiClient) });
}

export function useUpdateStore(): UseMutationResult<StoreDTO, unknown, { id: string; changes: UpdateStoreInput; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes, expectedVersion }) => updateStore(apiClient, id, changes, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['localization-current-store'] }),
  });
}
