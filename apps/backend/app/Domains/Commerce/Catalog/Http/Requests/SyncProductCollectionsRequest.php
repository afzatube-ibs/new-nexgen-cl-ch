<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SyncProductCollectionsRequest extends FormRequest
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
            'collection_ids' => ['present', 'array'],
            'collection_ids.*' => ['uuid', 'exists:collections,id'],
        ];
    }
}
