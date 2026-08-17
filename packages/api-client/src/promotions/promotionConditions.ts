import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { PromotionConditionDTO, PromotionConditionInput } from './types.js';

/**
 * `apps/backend/.../Promotions/routes.php` — `promotions/{promotion}/conditions`,
 * `promotions.promotions.manage` (conditions are managed as part of the
 * parent Promotion, not their own permission). No `list`/`get` endpoint —
 * conditions arrive only via `PromotionController::show`'s own eager-loaded
 * `conditions` array; this module only ever writes to them. `expectedVersion`
 * on every write here is the *parent Promotion's* own version — confirmed via
 * `AddPromotionConditionRequest`/`UpdatePromotionConditionRequest` directly.
 */
function basePath(promotionId: string): string {
  return `/promotions/${promotionId}/conditions`;
}

export function addPromotionCondition(client: ApiClient, promotionId: string, input: PromotionConditionInput): Promise<PromotionConditionDTO> {
  return client
    .post<DataEnvelope<PromotionConditionDTO>>(basePath(promotionId), {
      condition_type: input.conditionType,
      reference_id: input.referenceId ?? null,
      numeric_value: input.numericValue ?? null,
      expected_version: input.expectedVersion,
    })
    .then((r) => r.data);
}

export function updatePromotionCondition(
  client: ApiClient,
  promotionId: string,
  conditionId: string,
  input: PromotionConditionInput,
): Promise<PromotionConditionDTO> {
  return client
    .patch<DataEnvelope<PromotionConditionDTO>>(`${basePath(promotionId)}/${conditionId}`, {
      condition_type: input.conditionType,
      reference_id: input.referenceId ?? null,
      numeric_value: input.numericValue ?? null,
      expected_version: input.expectedVersion,
    })
    .then((r) => r.data);
}

export function removePromotionCondition(client: ApiClient, promotionId: string, conditionId: string, expectedVersion: number): Promise<void> {
  return client.delete<void>(`${basePath(promotionId)}/${conditionId}`, { expected_version: expectedVersion });
}
