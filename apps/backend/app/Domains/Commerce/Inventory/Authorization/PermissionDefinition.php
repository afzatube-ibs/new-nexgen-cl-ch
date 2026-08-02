<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Authorization;

final readonly class PermissionDefinition
{
    public function __construct(
        public string $key,
        public string $label,
        public string $module,
    ) {}
}
