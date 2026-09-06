<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Requests;

use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StorePageRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $routeStore = $this->route('store');
        /** @var Store $store */
        $store = $routeStore;
        $storeId = $store->id;
        $locale = (string) $this->input('locale', 'en');

        return [
            'slug' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('cms_pages', 'slug')->where(fn ($query) => $query->where('store_id', $storeId)->where('locale', $locale))],
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
