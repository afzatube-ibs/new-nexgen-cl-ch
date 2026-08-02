<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Http\Rules;

use Closure;
use DateTimeZone;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * SECURITY:INPUT_VALIDATION applied to a timezone: rather than a shape-only
 * regex (as this module deliberately uses for currency_code/country_code —
 * see CreateStoreRequest's docblock), a timezone can be validated exactly,
 * with zero new dependencies, against PHP's own IANA database.
 */
final class ValidTimezone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! in_array($value, DateTimeZone::listIdentifiers(), true)) {
            $fail('The :attribute must be a valid IANA timezone identifier.');
        }
    }
}
