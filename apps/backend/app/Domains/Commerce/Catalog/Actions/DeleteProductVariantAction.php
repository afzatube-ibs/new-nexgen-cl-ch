<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

final readonly class DeleteProductVariantAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ProductVariant $variant, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($variant, $expectedVersion, $actorId) {
            $variant->assertVersionMatches($expectedVersion);

            $before = $variant->only(['sku']);
            $variant->optionValues()->detach();

            // Free the SKU for reuse: `ProductVariant` uses SoftDeletes, so
            // the row never physically disappears, and the database's own
            // physical unique index on (tenant_id, sku) has no way to
            // exclude soft-deleted rows on either SQLite or MySQL (no
            // partial/filtered index support on this platform's chosen
            // engine, ADR-0003) — without this, a merchant who deletes a
            // variant and regenerates the identical option combination (a
            // normal, expected workflow, e.g. via the Variant Generator's
            // own "Generate all") hit a raw, unhandled 500
            // (`UniqueConstraintViolationException`) instead of a clean
            // validation error, since the FormRequest's own uniqueness
            // check (correctly) only looks at non-deleted rows. Salting the
            // stored value on delete is the standard pattern for this
            // (mirrors renaming a deleted user's email so it can be reused)
            // — `before`, above, already preserved the real SKU for the
            // audit trail. Found via a PO acceptance audit of Phase 2.2
            // (2026-08-11). Requires its own explicit `save()` — Eloquent's
            // `SoftDeletes::delete()` issues a targeted UPDATE of only the
            // `deleted_at` column via a fresh query, not a general
            // dirty-attribute save, so setting `sku` and calling `delete()`
            // alone silently discards the rename (found live: the rename
            // never reached the database at all).
            $variant->sku = mb_substr($variant->sku, 0, 54).'--deleted-'.$variant->id;
            $variant->save();
            $variant->delete();

            $this->auditLogger->log(
                action: 'product_variant.deleted',
                actorId: $actorId,
                targetType: ProductVariant::class,
                targetId: $variant->id,
                before: $before,
            );
        });
    }
}
