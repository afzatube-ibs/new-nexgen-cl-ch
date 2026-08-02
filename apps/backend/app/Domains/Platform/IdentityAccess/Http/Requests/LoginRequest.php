<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authentication IS the operation — SECURITY:AUTHORIZATION's
        // permission-check model does not apply to the act of logging in.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:255'],
        ];
    }
}
