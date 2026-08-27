<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;

/**
 * neXgen Overnight Sprint — Milestone 1, Objective 1 (Checkout → Shipping
 * Integration). This module cannot resolve a real shipping rate itself
 * (ARCH:DOMAIN_MAP forbids Checkout from depending on Operations\Shipping
 * in-process — see tests/Arch/ArchitectureTest.php's "Checkout never
 * depends on Operations or Growth" rule), so the caller — the Gateway,
 * which already composes Checkout's and Shipping's separate real public
 * HTTP contracts, exactly as it already does for the rest of this saga —
 * supplies a real, freshly-resolved quote (Shipping's own `POST shipping/
 * quote-options`) rather than an internal catalog id. Actions\
 * SelectShippingOptionAction stores these fields as-is; it recalculates
 * nothing, mirroring how Orders records figures a caller already resolved
 * rather than recomputing them itself.
 */
final class SelectShippingOptionRequest extends FormRequest
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
            'shipping_method_id' => ['required', 'string', 'max:255'],
            'shipping_label' => ['required', 'string', 'max:255'],
            'shipping_amount' => ['required', 'numeric', 'min:0'],
            'currency_code' => ['required', 'string', 'size:3', new IsValidCurrencyCode],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
