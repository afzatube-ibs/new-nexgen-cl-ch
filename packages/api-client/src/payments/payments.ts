import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { PaymentDTO, ListPaymentsQuery } from './types.js';

/** `apps/backend/.../Payments/routes.php` — `payments`, `payments.payments.view`. List only — see `types.ts`'s own docblock for why nothing else from Payments is wrapped here. */
const BASE_PATH = '/payments';

export function listPayments(client: ApiClient, query?: ListPaymentsQuery): Promise<ListEnvelope<PaymentDTO>> {
  return client.get<ListEnvelope<PaymentDTO>>(BASE_PATH, {
    query: query && { order_id: query.orderId, customer_id: query.customerId, status: query.status, page: query.page },
  });
}
