<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Production Completion Plan v2, Milestone 11 (Reviews Foundation) —
     * this module's own aggregate root. `product_id` references Catalog's
     * own Product by identifier only, never a foreign key — mirroring
     * `order_items.product_id`'s own identically-reasoned pattern (Reviews
     * has no code-level dependency on Catalog at all, confirmed by this
     * module's own Arch test).
     *
     * `customer_id` likewise references Customers by identifier only.
     * Reviews are customer-authenticated-only (no anonymous/guest review
     * path) — the one real, code-level cross-domain dependency this
     * module has is a narrow, read-only one on Orders (see
     * `Actions\CreateReviewAction`'s own docblock), exactly mirroring
     * Payments' own real, documented dependency on Orders. `order_id` is
     * populated only when that check finds a real, genuinely-purchased
     * order — nullable, since a review can exist without one (a real
     * customer account reviewing a product they never bought, honestly
     * un-badged rather than blocked outright).
     *
     * `status` implements the real moderation workflow this milestone's
     * own objective names: every new review starts `pending` and never
     * appears on the real, public storefront listing until a staff member
     * moves it to `approved` (or `rejected`, with a real reason).
     *
     * A real `unique(customer_id, product_id)` constraint: one review per
     * customer per product — a real, defensible anti-spam rule (an
     * operator wanting to record a changed opinion edits the existing
     * review rather than creating a second one; no edit endpoint exists
     * yet in this Phase 1 build — see the completion report's own honest
     * gaps).
     *
     * `author_name` is a snapshot of the real, authenticated Customer's own
     * `name` at submission time — read directly from the already-available
     * `customer.guard` principal (`$request->user()->name`), never a live
     * cross-domain query into Customers, mirroring `order_items.
     * product_name`'s own identically-reasoned snapshot pattern.
     *
     * `merchant_response_*` are flat columns rather than a separate table:
     * a review carries at most one real response, the identical shape
     * `ReviewCard.tsx`'s own `merchantResponse?: { body, respondedAt }`
     * already expects.
     *
     * `status` plus soft deletes implement DATA:LIFECYCLE. `lock_version`
     * implements DATA:VERSIONING. `tenant_id` implements ARCH:
     * DATA_OWNERSHIP's designed-in, unexercised tenant boundary.
     */
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');

            $table->uuid('product_id');
            $table->uuid('customer_id');
            $table->string('author_name');
            $table->uuid('order_id')->nullable();

            $table->unsignedTinyInteger('rating');
            $table->string('title')->nullable();
            $table->text('body');
            $table->boolean('verified_purchase')->default(false);

            $table->string('status')->default('pending');
            $table->text('rejection_reason')->nullable();

            $table->text('merchant_response_body')->nullable();
            $table->uuid('merchant_responded_by')->nullable();
            $table->timestamp('merchant_responded_at')->nullable();

            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'customer_id', 'product_id']);
            $table->index(['product_id', 'status']);
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
