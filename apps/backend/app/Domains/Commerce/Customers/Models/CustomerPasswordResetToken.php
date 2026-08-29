<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Models;

use Database\Factories\CustomerPasswordResetTokenFactory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset). See the
 * customer_password_reset_tokens migration's own docblock for why this
 * is keyed by `email` alone and stores only a hash of the real token.
 * Deliberately no `HasUuids`/`$incrementing` override needed — `email`
 * is this table's own real primary key, matching Laravel's own
 * established shape for this exact table type.
 *
 * @property string $email
 * @property string $token
 * @property Carbon|null $created_at
 */
final class CustomerPasswordResetToken extends Model
{
    /** @use HasFactory<CustomerPasswordResetTokenFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $primaryKey = 'email';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'email',
        'token',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /**
     * See Identity & Access's User::newFactory() docblock for why this
     * project keeps every factory directly under database/factories/
     * rather than mirroring the domain folder structure a second time.
     *
     * @return CustomerPasswordResetTokenFactory
     */
    protected static function newFactory(): Factory
    {
        return CustomerPasswordResetTokenFactory::new();
    }
}
