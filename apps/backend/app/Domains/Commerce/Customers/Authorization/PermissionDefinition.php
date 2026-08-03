<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Authorization;

/**
 * One entry in this module's PermissionRegistry — see Identity & Access's
 * identically-shaped class for the full rationale (each module owns its
 * own copy per MODULE:PUBLIC_CONTRACT).
 */
final readonly class PermissionDefinition
{
    public function __construct(
        public string $key,
        public string $label,
        public string $module,
    ) {}
}
