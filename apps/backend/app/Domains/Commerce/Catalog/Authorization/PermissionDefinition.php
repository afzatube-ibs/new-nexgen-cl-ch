<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Authorization;

/**
 * One entry in PermissionRegistry — see that class's docblock. Its own
 * value object rather than importing another module's identically-shaped
 * one, for the same reason Store Configuration's copy exists: this type
 * was never published as any other module's public contract.
 */
final readonly class PermissionDefinition
{
    public function __construct(
        public string $key,
        public string $label,
        public string $module,
    ) {}
}
