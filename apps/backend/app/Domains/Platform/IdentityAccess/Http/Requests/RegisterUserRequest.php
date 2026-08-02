<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

final class RegisterUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Permission enforcement happens once, at the route's `permission:`
        // middleware — never duplicated here, per SECURITY:AUTHORIZATION's
        // "no module performs its own bespoke, disconnected permission
        // logic."
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
        ];
    }
}
