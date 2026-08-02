<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use App\Domains\Commerce\Catalog\Models\Attribute;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CreateAttributeRequest extends FormRequest
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
            'attribute_group_id' => ['nullable', 'uuid', 'exists:attribute_groups,id'],
            'code' => ['required', 'string', 'max:100', 'alpha_dash', 'unique:attributes,code'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', Rule::in(Attribute::types())],
            'is_filterable' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
