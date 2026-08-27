<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Authorization;

/**
 * One entry in PermissionRegistry — mirrors
 * `StoreConfiguration\Authorization\PermissionDefinition` exactly; see that
 * class's docblock for why each module keeps its own copy.
 */
final readonly class PermissionDefinition
{
    public function __construct(
        public string $key,
        public string $label,
        public string $module,
    ) {}
}
