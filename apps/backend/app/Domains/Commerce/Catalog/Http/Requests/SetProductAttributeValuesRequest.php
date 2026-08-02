<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use App\Domains\Commerce\Catalog\Models\Attribute;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

final class SetProductAttributeValuesRequest extends FormRequest
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
            'values' => ['required', 'array'],
            'values.*' => ['nullable', 'string'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * `values` is keyed by attribute id (Attribute id => value), which
     * Laravel's array validation rules cannot express directly (`*.` rules
     * validate values, not keys) — validated here instead.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $keys = array_keys($this->input('values', []));

            if ($keys === []) {
                return;
            }

            $validCount = Attribute::query()->whereIn('id', $keys)->count();

            if ($validCount !== count($keys)) {
                $validator->errors()->add('values', 'One or more attribute ids do not exist.');
            }
        });
    }
}
