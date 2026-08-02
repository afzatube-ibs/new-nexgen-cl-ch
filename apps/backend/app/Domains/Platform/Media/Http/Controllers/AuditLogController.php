<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Http\Controllers;

use App\Domains\Platform\Media\Audit\AuditLog;
use App\Domains\Platform\Media\Http\Resources\AuditLogResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class AuditLogController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = AuditLog::query()->orderByDesc('created_at');

        if ($request->filled('target_id')) {
            $query->where('target_id', $request->string('target_id')->toString());
        }

        return AuditLogResource::collection($query->paginate(perPage: (int) $request->integer('per_page', 25)));
    }
}
