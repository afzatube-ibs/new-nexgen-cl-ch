<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Authorization;

/**
 * One entry in PermissionRegistry — see that class's docblock. Deliberately
 * its own value object rather than importing Identity & Access's
 * identically-shaped one: this small type was never published as part of
 * that module's public contract, so depending on it would be depending on
 * Identity & Access's internal implementation, which MODULE:PUBLIC_CONTRACT
 * forbids.
 */
final readonly class PermissionDefinition
{
    public function __construct(
        public string $key,
        public string $label,
        public string $module,
    ) {}
}
