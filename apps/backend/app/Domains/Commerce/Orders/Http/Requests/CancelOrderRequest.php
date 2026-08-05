<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CancelOrderRequest extends FormRequest
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
            'reason' => ['required', 'string', 'max:1000'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
