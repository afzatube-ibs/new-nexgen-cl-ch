<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Models;

use App\Domains\Commerce\Customers\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\CustomerFactory;
use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * MODULE:CUSTOMERS' aggregate root — customer-facing account and profile
 * data, distinct from Identity & Access's staff User (see the customers
 * migration's docblock). This aggregate also owns its address book (see
 * CustomerAddress and the customer_addresses migration's docblock).
 *
 * `status` plus soft deletes implement DATA:LIFECYCLE's
 * Active/Archived/Deleted framework. `lock_version` implements
 * DATA:VERSIONING for the whole aggregate, including address changes.
 * `tenant_id` implements ARCH:DATA_OWNERSHIP's designed-in, unexercised
 * tenant boundary.
 *
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — the
 * self-service authentication endpoint Actions\RegisterCustomerAction's
 * own docblock named as the reason `HasApiTokens` was withheld now exists
 * (Actions\LoginCustomerAction, Http\Controllers\CustomerAuthController),
 * so the trait is real, used infrastructure, not speculative. A Customer's
 * token and a staff User's token share Sanctum's one polymorphic
 * `personal_access_tokens` table (`tokenable_type` already discriminates
 * by model class) but must never be interchangeable at the authorization
 * boundary — see Http\Middleware\EnsureCustomerPrincipal and Identity &
 * Access's own Http\Middleware\EnsureStaffPrincipal, the two explicit,
 * defense-in-depth checks that make that boundary real rather than
 * assumed. `Customer` still has no `hasPermission()`/`can()` capable of
 * satisfying `permission:` (EnsurePermission requires that method to
 * exist) or Identity & Access's own Gate::before — a customer's token can
 * authenticate, never authorize, a staff-only action.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string|null $email
 * @property string $password
 * @property string|null $phone
 * @property string $phone_verification_status
 * @property Carbon|null $phone_verified_at
 * @property string $status
 * @property int $lock_version
 */
final class Customer extends Model implements AuthenticatableContract
{
    /** @use HasFactory<CustomerFactory> */
    use Authenticatable, HasApiTokens, HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    /**
     * Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — the Product
     * Owner's own addendum's three states. `phone_verified_at` (set only
     * by Slice 4.2's OTP module, never mass-assignable here) is the
     * authoritative signal; this column is the human/Admin-facing label
     * plus the one state (`BLOCKED`) that isn't derivable from a
     * timestamp alone.
     */
    public const string PHONE_UNVERIFIED = 'unverified';

    public const string PHONE_VERIFIED = 'verified';

    public const string PHONE_BLOCKED = 'blocked';

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'phone_verification_status',
        'status',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'phone_verified_at' => 'datetime',
        ];
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return CustomerFactory
     */
    protected static function newFactory(): Factory
    {
        return CustomerFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $customer): void {
            $customer->tenant_id ??= TenantId::DEFAULT;
            $customer->status ??= self::STATUS_ACTIVE;
            $customer->phone_verification_status ??= self::PHONE_UNVERIFIED;
            // See Identity & Access's User::booted() for why this is set
            // here rather than relying on the migration's database-level
            // default: a caller reading $customer->lock_version
            // immediately after creation would otherwise see null instead
            // of 1.
            $customer->lock_version ??= 1;
        });
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isPhoneVerified(): bool
    {
        return $this->phone_verification_status === self::PHONE_VERIFIED;
    }

    /**
     * @return HasMany<CustomerAddress, $this>
     */
    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class);
    }

    /**
     * Bumps the aggregate's version without changing any other field —
     * called by address-mutating actions, since Customer and its
     * addresses are one aggregate but an address change touches no column
     * on the `customers` row itself. See the customer_addresses
     * migration's docblock for the full rationale.
     */
    public function touchAggregateVersion(): void
    {
        $this->lock_version++;
        $this->save();
    }
}
