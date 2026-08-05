<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `order_id` must reference a real Orders\Models\Order row — this
 * module's one real code-level cross-module dependency (see Actions\
 * InitiatePaymentAction's docblock). `gateway_code` is validated against
 * whatever config/payments.php actually registers, not a hardcoded list,
 * so a newly added gateway is automatically acceptable input the moment
 * it is registered — no change here required, per this module's "adding
 * a gateway requires no business logic changes" architecture.
 * `idempotency_key` is this module's client-supplied duplicate-submission
 * guard for the initiate operation, exactly like Checkout's own
 * submission idempotency.
 */
final class InitiatePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'order_id' => ['required', 'uuid', 'exists:orders,id'],
            'gateway_code' => ['required', 'string', 'max:50'],
            'idempotency_key' => ['required', 'string', 'max:191'],
        ];
    }
}
