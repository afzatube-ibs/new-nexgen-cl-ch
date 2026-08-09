import {
  listOptions,
  createOption,
  updateOption,
  destroyOption,
  restoreOption,
  addOptionValue,
  updateOptionValue,
  removeOptionValue,
  type OptionDTO,
  type CreateOptionInput,
  type UpdateOptionInput,
  type ListQuery,
} from '@nexgen/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createResourceHooks, apiClient } from '../shared/useResourceQueries.js';

const QUERY_KEY = 'catalog-options';

export const {
  useResourceList: useOptions,
  useCreateResource: useCreateOption,
  useUpdateResource: useUpdateOption,
  useDestroyResource: useDestroyOption,
  useRestoreResource: useRestoreOption,
} = createResourceHooks<OptionDTO, CreateOptionInput, UpdateOptionInput, ListQuery>(QUERY_KEY, {
  list: (query) => listOptions(apiClient, query),
  create: (input) => createOption(apiClient, input),
  update: (id, input) => updateOption(apiClient, id, input),
  destroy: (id, expectedVersion) => destroyOption(apiClient, id, expectedVersion),
  restore: (id) => restoreOption(apiClient, id),
});

/** Values aren't independently versioned — every write guards the *owning Option's* `version` (`expected_option_version`). Each mutation here invalidates the Options list so the caller always re-reads the Option's fresh `version` after a change. */
export function useAddOptionValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId, value, expectedOptionVersion }: { optionId: string; value: string; expectedOptionVersion: number }) =>
      addOptionValue(apiClient, optionId, { value, expectedOptionVersion }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateOptionValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      optionId,
      valueId,
      value,
      expectedOptionVersion,
    }: {
      optionId: string;
      valueId: string;
      value: string;
      expectedOptionVersion: number;
    }) => updateOptionValue(apiClient, optionId, valueId, { value, expectedOptionVersion }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useRemoveOptionValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId, valueId, expectedOptionVersion }: { optionId: string; valueId: string; expectedOptionVersion: number }) =>
      removeOptionValue(apiClient, optionId, valueId, expectedOptionVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
