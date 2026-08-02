<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SyncProductOptionsRequest extends FormRequest
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
            'option_ids' => ['present', 'array'],
            'option_ids.*' => ['uuid', 'exists:options,id'],
        ];
    }
}
