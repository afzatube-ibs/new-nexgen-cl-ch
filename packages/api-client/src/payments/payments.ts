import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { PaymentDTO, ListPaymentsQuery, PaymentMethodDTO } from './types.js';

/** `apps/backend/.../Payments/routes.php` — `payments`, `payments.payments.view`. Read-only (`list`/`get`) — no Initiate/Capture/Cancel/Void action is wrapped here, see `types.ts`'s own docblock. */
const BASE_PATH = '/payments';

export function listPayments(client: ApiClient, query?: ListPaymentsQuery): Promise<ListEnvelope<PaymentDTO>> {
  return client.get<ListEnvelope<PaymentDTO>>(BASE_PATH, {
    query: query && { order_id: query.orderId, customer_id: query.customerId, status: query.status, page: query.page },
  });
}

/** `PaymentController::show` — the only endpoint that loads `attempts` (`$payment->load('attempts')`, confirmed by reading it directly). */
export function getPayment(client: ApiClient, id: string): Promise<PaymentDTO> {
  return client.get<DataEnvelope<PaymentDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

/**
 * `GET /payments/methods` — the real gateway registry, `payments.payments.view`.
 * `{ all: true }` (Milestone 12, Production Readiness Indicators) lists
 * every REGISTERED gateway, configured or not — the default (no options)
 * preserves the pre-existing available-only behavior real checkout
 * screens already depend on.
 */
export function listPaymentMethods(client: ApiClient, options?: { all?: boolean }): Promise<ListEnvelope<PaymentMethodDTO>> {
  return client.get<ListEnvelope<PaymentMethodDTO>>(`${BASE_PATH}/methods`, { query: options?.all ? { all: 1 } : undefined });
}
