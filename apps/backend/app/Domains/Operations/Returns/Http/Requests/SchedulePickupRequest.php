<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SchedulePickupRequest extends FormRequest
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
            'provider_code' => ['sometimes', 'nullable', 'string', 'max:100'],
            'tracking_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
