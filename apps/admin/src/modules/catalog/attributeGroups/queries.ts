import {
  listAttributeGroups,
  createAttributeGroup,
  updateAttributeGroup,
  destroyAttributeGroup,
  restoreAttributeGroup,
  type AttributeGroupDTO,
  type CreateAttributeGroupInput,
  type UpdateAttributeGroupInput,
  type ListQuery,
} from '@nexgen/api-client';
import { createResourceHooks, apiClient } from '../shared/useResourceQueries.js';

export const {
  useResourceList: useAttributeGroups,
  useCreateResource: useCreateAttributeGroup,
  useUpdateResource: useUpdateAttributeGroup,
  useDestroyResource: useDestroyAttributeGroup,
  useRestoreResource: useRestoreAttributeGroup,
} = createResourceHooks<AttributeGroupDTO, CreateAttributeGroupInput, UpdateAttributeGroupInput, ListQuery>('catalog-attribute-groups', {
  list: (query) => listAttributeGroups(apiClient, query),
  create: (input) => createAttributeGroup(apiClient, input),
  update: (id, input) => updateAttributeGroup(apiClient, id, input),
  destroy: (id, expectedVersion) => destroyAttributeGroup(apiClient, id, expectedVersion),
  restore: (id) => restoreAttributeGroup(apiClient, id),
});
