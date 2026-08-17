import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { PaymentDTO, PaymentExpectedVersionInput, PaymentReasonInput, AttachBankTransferProofInput } from './types.js';

/**
 * `apps/backend/.../Payments/routes.php` — the real Merchant Payment
 * Operations, one function per `PaymentActionController`/
 * `BankTransferVerificationController` endpoint. Permission-gated
 * server-side per its own key (`payments.payments.manage` for capture/
 * cancel/void/proof-attach, `payments.bank_transfer.verify` — a distinct,
 * narrower grant — for approve/reject, confirmed via `PermissionRegistry.
 * php` directly), never re-derived or bypassed here; the caller decides
 * which of these to even offer, via `RequirePermission`.
 */
const BASE_PATH = '/payments';

function unwrap(client: ApiClient, path: string, body: Record<string, unknown>): Promise<PaymentDTO> {
  return client.post<DataEnvelope<PaymentDTO>>(path, body).then((r) => r.data);
}

/** `POST /payments/{id}/capture` — `payments.payments.manage`. The manual-confirmation path (Cash On Delivery "cash collected", or a caller confirming a gateway-reported success without going through the webhook) — always captures the payment's own full original `amount`, no override (`ExpectedVersionRequest`, confirmed by reading it directly: no `amount` field exists). */
export function capturePayment(client: ApiClient, id: string, input: PaymentExpectedVersionInput): Promise<PaymentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/capture`, { expected_version: input.expectedVersion });
}

/** `POST /payments/{id}/cancel` — `payments.payments.manage`. `reason` is `required` (`CancelPaymentRequest`). */
export function cancelPayment(client: ApiClient, id: string, input: PaymentReasonInput): Promise<PaymentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/cancel`, { reason: input.reason, expected_version: input.expectedVersion });
}

/** `POST /payments/{id}/void` — `payments.payments.manage`. `reason` is `required` (`VoidPaymentRequest`). Real backend precondition: only reachable from `authorized` (`Models\Payment::TRANSITIONS`, confirmed by reading it directly) — this wrapper does not check it; the caller does, client-side, to avoid offering a button that will always 422. */
export function voidPayment(client: ApiClient, id: string, input: PaymentReasonInput): Promise<PaymentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/void`, { reason: input.reason, expected_version: input.expectedVersion });
}

/** `POST /payments/{id}/bank-transfer/proof` — `payments.payments.manage`. `proof_reference` is a plain identifier string (`AttachBankTransferProofRequest`) — a future Media-module attachment id, never a file this endpoint uploads. */
export function attachBankTransferProof(client: ApiClient, id: string, input: AttachBankTransferProofInput): Promise<PaymentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/bank-transfer/proof`, { proof_reference: input.proofReference, expected_version: input.expectedVersion });
}

/** `POST /payments/{id}/bank-transfer/approve` — `payments.bank_transfer.verify`, a distinct, narrower permission from `.manage` (confirmed live via the real backend's own test suite: `.manage` alone is correctly denied). Internally reuses `CapturePaymentAction` — the payment transitions to `captured`. */
export function approveBankTransfer(client: ApiClient, id: string, input: PaymentExpectedVersionInput): Promise<PaymentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/bank-transfer/approve`, { expected_version: input.expectedVersion });
}

/** `POST /payments/{id}/bank-transfer/reject` — `payments.bank_transfer.verify`. `reason` is `required` (`RejectBankTransferRequest`). Internally reuses `MarkPaymentFailedAction` — the payment transitions to `failed`, not a dedicated "rejected" status. */
export function rejectBankTransfer(client: ApiClient, id: string, input: PaymentReasonInput): Promise<PaymentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/bank-transfer/reject`, { reason: input.reason, expected_version: input.expectedVersion });
}
