<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Models;

use Database\Factories\CustomerAddressFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A single entry in a Customer's address book — a child entity of the
 * Customer aggregate, never modified except through its owning Customer.
 * See the customer_addresses migration's docblock for why this carries no
 * `lock_version` of its own.
 *
 * @property string $id
 * @property string $customer_id
 * @property string|null $label
 * @property string $recipient_name
 * @property string|null $phone
 * @property string $address_line1
 * @property string|null $address_line2
 * @property string $city
 * @property string|null $region
 * @property string|null $postal_code
 * @property string $country_code
 * @property bool $is_default_shipping
 * @property bool $is_default_billing
 */
final class CustomerAddress extends Model
{
    /** @use HasFactory<CustomerAddressFactory> */
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'customer_id',
        'label',
        'recipient_name',
        'phone',
        'address_line1',
        'address_line2',
        'city',
        'region',
        'postal_code',
        'country_code',
        'is_default_shipping',
        'is_default_billing',
    ];

    protected function casts(): array
    {
        return [
            'is_default_shipping' => 'boolean',
            'is_default_billing' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        self::saving(function (self $address): void {
            if ($address->isDirty('country_code')) {
                $address->country_code = strtoupper((string) $address->country_code);
            }
        });
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return CustomerAddressFactory
     */
    protected static function newFactory(): Factory
    {
        return CustomerAddressFactory::new();
    }

    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
