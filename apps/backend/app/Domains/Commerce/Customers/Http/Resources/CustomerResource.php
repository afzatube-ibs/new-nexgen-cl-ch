<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Resources;

use App\Domains\Commerce\Customers\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API:PHILOSOPHY: "An API surfaces a contract, never an implementation."
 * Deliberately excludes the password hash (never serialized regardless —
 * see Customer::$hidden — but excluded here explicitly too, as defense in
 * depth per SECURITY:DEFENSE_IN_DEPTH) and tenant_id (Phase 1 has exactly
 * one tenant; exposing an always-constant field would be a contract
 * commitment this platform isn't ready to make yet).
 *
 * @mixin Customer
 */
final class CustomerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'status' => $this->status,
            'addresses' => CustomerAddressResource::collection($this->whenLoaded('addresses')),
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
