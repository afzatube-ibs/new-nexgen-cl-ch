<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Requests;

use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Reuses Localization & Currency's IsValidCurrencyCode rule rather than
 * duplicating the ISO 4217 list, exactly as every other module's own
 * currency-accepting request already does (allowed per MODULE:
 * INTERACTION_RULES' "Into Platform" exception).
 */
final class ResolveReturnRequestRequest extends FormRequest
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
            'resolution' => ['required', Rule::in([
                ReturnRequest::RESOLUTION_REFUND,
                ReturnRequest::RESOLUTION_EXCHANGE,
                ReturnRequest::RESOLUTION_REJECT,
            ])],
            'resolution_notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'payment_id' => ['required_if:resolution,refund', 'uuid'],
            'amount' => ['required_if:resolution,refund', 'numeric', 'min:0.01'],
            'currency_code' => ['required_if:resolution,refund', 'string', 'size:3', new IsValidCurrencyCode],
            'desired_sku' => ['required_if:resolution,exchange', 'string', 'max:100'],
            'desired_description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'desired_quantity' => ['required_if:resolution,exchange', 'integer', 'min:1'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
