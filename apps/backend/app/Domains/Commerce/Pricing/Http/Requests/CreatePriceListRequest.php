<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `is_default` is deliberately not accepted here — see
 * Actions\CreatePriceListAction's docblock for why promoting a list to
 * default is a separate operation. `currency_code` is validated against
 * Localization & Currency's curated ISO 4217 list — a declared dependency
 * of this module (docs/04_MODULE_ARCHITECTURE.md's MODULE:PRICING entry;
 * the master plan's "Catalog, Localization & Currency") — rather than
 * duplicating that list a further time.
 */
final class CreatePriceListRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'currency_code' => ['required', 'string', 'size:3', new IsValidCurrencyCode],
        ];
    }
}
