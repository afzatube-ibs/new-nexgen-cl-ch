<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * "Proof Upload Extension Point" — `proof_reference` is an identifier
 * only (a future Media module attachment id), never a file this request
 * itself handles uploading — see Models\Payment's `proof_reference`
 * column docblock and Gateways\BankTransferGateway's own docblock for why.
 */
final class AttachBankTransferProofRequest extends FormRequest
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
            'proof_reference' => ['required', 'string', 'max:255'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
