<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ExpectedVersionRequest extends FormRequest
{
    public function rules(): array
    {
        return ['expected_version' => ['required', 'integer', 'min:1']];
    }
}
