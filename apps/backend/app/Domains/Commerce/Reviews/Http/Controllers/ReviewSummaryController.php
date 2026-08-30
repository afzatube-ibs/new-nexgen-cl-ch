<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Http\Controllers;

use App\Domains\Commerce\Reviews\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * `GET /reviews/summary?product_id=` — the one small, additive, read-only
 * aggregate `RatingSummary.tsx` needs (average rating, total count, 1-5
 * star distribution) that no per-review listing endpoint provides,
 * mirroring `OrderMetricsController`'s own documented precedent for this
 * exact shape of endpoint.
 *
 * Always scoped to `status = approved` — a pending or rejected review is
 * real content in the moderation queue, but it is not yet a real public
 * rating, exactly as `ReviewController::index()`'s own public listing path
 * defaults to `approved`-only for the same reason.
 *
 * Queries via the plain `DB` query builder rather than the `Review`
 * Eloquent model: an `AVG`/`COUNT`/`GROUP BY` aggregate row has no
 * relationship to the model's own real attributes or casts, the same
 * reasoning `OrderMetricsController::revenueByCurrency()` already
 * documents for this platform's recurring decimal-cast bug class.
 */
final class ReviewSummaryController
{
    public function show(Request $request): JsonResponse
    {
        $productId = (string) $request->query('product_id', '');

        if ($productId === '') {
            return response()->json(['data' => [
                'averageRating' => null,
                'totalCount' => 0,
                'distribution' => [],
            ]]);
        }

        $rows = DB::table('reviews')
            ->where('product_id', $productId)
            ->where('status', Review::STATUS_APPROVED)
            ->whereNull('deleted_at')
            ->selectRaw('rating, COUNT(*) as bucket_count')
            ->groupBy('rating')
            ->get();

        $totalCount = (int) $rows->sum('bucket_count');

        $distribution = collect([1, 2, 3, 4, 5])->map(function (int $stars) use ($rows): array {
            $row = $rows->firstWhere('rating', $stars);

            return ['stars' => $stars, 'count' => $row !== null ? (int) $row->bucket_count : 0];
        })->all();

        $averageRating = null;

        if ($totalCount > 0) {
            $weightedSum = $rows->sum(static fn (object $row): int => (int) $row->rating * (int) $row->bucket_count);
            $averageRating = round($weightedSum / $totalCount, 1);
        }

        return response()->json(['data' => [
            'averageRating' => $averageRating,
            'totalCount' => $totalCount,
            'distribution' => $distribution,
        ]]);
    }
}
