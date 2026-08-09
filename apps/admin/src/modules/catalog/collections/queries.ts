import {
  listCollections,
  createCollection,
  updateCollection,
  archiveCollection,
  destroyCollection,
  restoreCollection,
  type CollectionDTO,
  type CreateCollectionInput,
  type UpdateCollectionInput,
  type ListQuery,
} from '@nexgen/api-client';
import { createResourceHooks, apiClient } from '../shared/useResourceQueries.js';

export const {
  useResourceList: useCollections,
  useCreateResource: useCreateCollection,
  useUpdateResource: useUpdateCollection,
  useArchiveResource: useArchiveCollection,
  useDestroyResource: useDestroyCollection,
  useRestoreResource: useRestoreCollection,
} = createResourceHooks<CollectionDTO, CreateCollectionInput, UpdateCollectionInput, ListQuery>('catalog-collections', {
  list: (query) => listCollections(apiClient, query),
  create: (input) => createCollection(apiClient, input),
  update: (id, input) => updateCollection(apiClient, id, input),
  archive: (id, expectedVersion) => archiveCollection(apiClient, id, expectedVersion),
  destroy: (id, expectedVersion) => destroyCollection(apiClient, id, expectedVersion),
  restore: (id) => restoreCollection(apiClient, id),
});
