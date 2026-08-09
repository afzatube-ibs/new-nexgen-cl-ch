import {
  listAttributes,
  createAttribute,
  updateAttribute,
  destroyAttribute,
  restoreAttribute,
  type AttributeDTO,
  type CreateAttributeInput,
  type UpdateAttributeInput,
  type ListQuery,
} from '@nexgen/api-client';
import { createResourceHooks, apiClient } from '../shared/useResourceQueries.js';

export const {
  useResourceList: useAttributes,
  useCreateResource: useCreateAttribute,
  useUpdateResource: useUpdateAttribute,
  useDestroyResource: useDestroyAttribute,
  useRestoreResource: useRestoreAttribute,
} = createResourceHooks<AttributeDTO, CreateAttributeInput, UpdateAttributeInput, ListQuery>('catalog-attributes', {
  list: (query) => listAttributes(apiClient, query),
  create: (input) => createAttribute(apiClient, input),
  update: (id, input) => updateAttribute(apiClient, id, input),
  destroy: (id, expectedVersion) => destroyAttribute(apiClient, id, expectedVersion),
  restore: (id) => restoreAttribute(apiClient, id),
});
