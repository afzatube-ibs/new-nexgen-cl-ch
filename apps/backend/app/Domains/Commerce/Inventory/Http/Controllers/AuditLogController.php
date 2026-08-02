<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Controllers;

use App\Domains\Commerce\Inventory\Audit\AuditLog;
use App\Domains\Commerce\Inventory\Http\Resources\AuditLogResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class AuditLogController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = AuditLog::query()->orderByDesc('created_at');

        if ($request->filled('target_type')) {
            $query->where('target_type', $request->string('target_type')->toString());
        }

        return AuditLogResource::collection($query->paginate(perPage: (int) $request->integer('per_page', 25)));
    }
}
