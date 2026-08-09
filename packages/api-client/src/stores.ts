import type { ApiClient } from './client.js';
import type { ListEnvelope, StoreDTO } from './types.js';

/**
 * `GET /api/v1/stores` — Store Configuration (`MODULE:STORE_CONFIGURATION`,
 * already a real Phase 1 endpoint). Backs the Admin Shell's workspace
 * switcher (docs/frontend/ADMIN_SHELL_ARCHITECTURE.md §3): it renders the
 * current store's own name, real data, not a placeholder — only the
 * switcher's own dropdown *interaction* is a "Coming soon" placeholder,
 * pending a real multi-tenant concept to switch between.
 */
export async function listStores(client: ApiClient): Promise<StoreDTO[]> {
  const response = await client.get<ListEnvelope<StoreDTO>>('/stores');
  return response.data;
}
