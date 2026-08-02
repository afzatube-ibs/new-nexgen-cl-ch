<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateUserRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->route('user'))],
            // DATA:VERSIONING: the caller states the version it last read;
            // a mismatch is a 409, never a silent overwrite.
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
