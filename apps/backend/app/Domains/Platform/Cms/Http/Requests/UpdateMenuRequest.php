<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Requests;

use App\Domains\Platform\Cms\Models\CmsMenu;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateMenuRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var Store $store */
        $store = $this->route('store');
        /** @var CmsMenu $menu */
        $menu = $this->route('menu');

        return [
            'expected_version' => ['required', 'integer', 'min:1'],
            'handle' => ['sometimes', 'required', 'string', 'max:64', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('cms_menus', 'handle')->where(fn ($query) => $query->where('store_id', $store->id))->ignore($menu->id)],
            'title' => ['sometimes', 'required', 'string', 'max:120'],
            'items' => ['sometimes', 'required', 'array', 'max:30'],
            'items.*.id' => ['required_with:items', 'string', 'max:80', 'distinct'],
            'items.*.label' => ['required_with:items', 'string', 'max:120'],
            'items.*.href' => ['required_with:items', 'string', 'max:2048', 'regex:/^(?:\/[^\s]*|https?:\/\/[^\s]+)$/i'],
        ];
    }
}
