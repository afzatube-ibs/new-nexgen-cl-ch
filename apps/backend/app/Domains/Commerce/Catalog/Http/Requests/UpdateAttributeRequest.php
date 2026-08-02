<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use App\Domains\Commerce\Catalog\Models\Attribute;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateAttributeRequest extends FormRequest
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
            'attribute_group_id' => ['sometimes', 'nullable', 'uuid', 'exists:attribute_groups,id'],
            'code' => ['sometimes', 'string', 'max:100', 'alpha_dash', Rule::unique('attributes', 'code')->ignore($this->route('attribute'))],
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'string', Rule::in(Attribute::types())],
            'is_filterable' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
