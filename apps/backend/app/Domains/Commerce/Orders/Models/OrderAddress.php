<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Models;

use Database\Factories\OrderAddressFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A frozen billing or shipping address snapshot for an Order — see the
 * order_addresses migration's docblock.
 *
 * @property string $id
 * @property string $order_id
 * @property string $address_type
 * @property string $recipient_name
 * @property string|null $phone
 * @property string $address_line1
 * @property string|null $address_line2
 * @property string $city
 * @property string|null $region
 * @property string|null $postal_code
 * @property string $country_code
 */
final class OrderAddress extends Model
{
    /** @use HasFactory<OrderAddressFactory> */
    use HasFactory, HasUuids;

    public const string TYPE_BILLING = 'billing';

    public const string TYPE_SHIPPING = 'shipping';

    protected $fillable = [
        'order_id',
        'address_type',
        'recipient_name',
        'phone',
        'address_line1',
        'address_line2',
        'city',
        'region',
        'postal_code',
        'country_code',
    ];

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
     * @return OrderAddressFactory
     */
    protected static function newFactory(): Factory
    {
        return OrderAddressFactory::new();
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
