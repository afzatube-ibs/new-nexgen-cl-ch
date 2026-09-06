<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StorePageRequest extends FormRequest
{
    public function rules(): array
    {
        $storeId = (string) $this->route('store')?->id;
        $locale = (string) $this->input('locale', 'en');

        return [
            'slug' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('cms_pages', 'slug')->where(fn ($q) => $q->where('store_id', $storeId)->where('locale', $locale))],
            'title' => ['required', 'string', 'max:180'],
            'locale' => ['required', 'string', 'max:16'],
            'content' => ['required', 'array', 'max:30'],
            'content.*.type' => ['required', 'string', 'max:64'],
            'content.*.configuration' => ['required', 'array'],
            'content.*.key' => ['nullable', 'string', 'max:100'],
            'meta_title' => ['nullable', 'string', 'max:180'],
            'meta_description' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
