import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { ReturnNoteDTO, AddReturnNoteInput } from './types.js';

/** `POST /return-requests/{id}/notes` — `returns.requests.manage`. Append-only: no edit/delete endpoint exists, mirrors `ShipmentNote`'s own shape. */
export function addReturnNote(client: ApiClient, returnRequestId: string, input: AddReturnNoteInput): Promise<ReturnNoteDTO> {
  return client
    .post<DataEnvelope<ReturnNoteDTO>>(`/return-requests/${returnRequestId}/notes`, {
      body: input.body,
      is_customer_visible: input.isCustomerVisible ?? false,
    })
    .then((r) => r.data);
}
