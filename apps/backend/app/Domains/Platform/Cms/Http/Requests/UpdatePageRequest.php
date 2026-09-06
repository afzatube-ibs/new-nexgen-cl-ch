<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdatePageRequest extends FormRequest
{
    public function rules(): array
    {
        $storeId = (string) $this->route('store')?->id;
        $page = $this->route('page');
        $locale = (string) $this->input('locale', $page?->locale ?? 'en');

        return [
            'expected_version' => ['required', 'integer', 'min:1'],
            'slug' => ['sometimes', 'required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('cms_pages', 'slug')->where(fn ($q) => $q->where('store_id', $storeId)->where('locale', $locale))->ignore($page?->id)],
            'title' => ['sometimes', 'required', 'string', 'max:180'],
            'locale' => ['sometimes', 'required', 'string', 'max:16'],
            'content' => ['sometimes', 'required', 'array', 'max:30'],
            'content.*.type' => ['required_with:content', 'string', 'max:64'],
            'content.*.configuration' => ['required_with:content', 'array'],
            'content.*.key' => ['nullable', 'string', 'max:100'],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:180'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
