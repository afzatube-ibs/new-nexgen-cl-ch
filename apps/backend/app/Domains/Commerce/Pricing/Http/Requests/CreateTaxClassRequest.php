<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateTaxClassRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255', 'unique:tax_classes,name'],
        ];
    }
}
