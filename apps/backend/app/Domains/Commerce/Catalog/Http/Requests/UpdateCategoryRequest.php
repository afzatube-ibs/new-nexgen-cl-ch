<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use App\Domains\Commerce\Catalog\Models\Category;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateCategoryRequest extends FormRequest
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
            'parent_id' => ['sometimes', 'nullable', 'uuid', 'exists:categories,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $category = $this->route('category');

            if ($category instanceof Category && $this->input('parent_id') === $category->id) {
                $validator->errors()->add('parent_id', 'A category cannot be its own parent.');
            }
        });
    }
}
