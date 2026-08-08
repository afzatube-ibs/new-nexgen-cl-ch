<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Http\Controllers;

use App\Domains\Commerce\Search\Audit\AuditLog;
use App\Domains\Commerce\Search\Http\Resources\AuditLogResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class AuditLogController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = AuditLog::query()->orderByDesc('created_at');

        if ($request->filled('actor_id')) {
            $query->where('actor_id', $request->string('actor_id')->toString());
        }

        if ($request->filled('target_type')) {
            $query->where('target_type', $request->string('target_type')->toString());
        }

        return AuditLogResource::collection($query->paginate(perPage: (int) $request->integer('per_page', 25)));
    }
}
