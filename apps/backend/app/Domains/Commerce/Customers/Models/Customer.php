<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Models;

use App\Domains\Commerce\Customers\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use Database\Factories\CustomerFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

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
 * Deliberately does not use Laravel\Sanctum\HasApiTokens: no self-service
 * authentication endpoint exists yet (see Actions\RegisterCustomerAction's
 * docblock for the full scoping rationale) — adding token-issuance
 * capability with nothing that ever calls it would be exactly the
 * speculative, unused infrastructure this platform's engineering
 * principles reject. `password` is still a real, hashed column now,
 * because a customer's credential is core to what this aggregate models,
 * even before a login route exists to use it.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string $email
 * @property string $password
 * @property string|null $phone
 * @property string $status
 * @property int $lock_version
 */
final class Customer extends Model
{
    /** @use HasFactory<CustomerFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids, SoftDeletes;

    public const string STATUS_ACTIVE = 'active';

    public const string STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'status',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
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
