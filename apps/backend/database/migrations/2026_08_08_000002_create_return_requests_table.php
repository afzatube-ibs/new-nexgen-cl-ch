<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:RETURNS' aggregate root — "owns return and exchange requests
     * and their status," per docs/04_MODULE_ARCHITECTURE.md. `order_id`
     * and `customer_id` reference Orders' and Customers' own aggregates by
     * identifier only, never a foreign key, per ARCH:CROSS_DOMAIN_
     * COMMUNICATION — mirroring Fulfillment's identically-reasoned
     * `shipments.order_id` (Returns is Operations-domain, same as
     * Fulfillment, and this document's own boundary text states Returns
     * "does not directly depend on Commerce modules"). Operator/customer-
     * supplied at request-creation time, exactly like Fulfillment's manual
     * creation path — this module has no OrderPlaced-style automatic
     * reaction, since a return is customer-initiated after delivery, not
     * triggered by any single upstream event.
     *
     * `rma_number` is this module's own human-readable reference (Return
     * Merchandise Authorization) — a label, never used as identity per
     * DATA:ENTITY_IDENTITY, generated once at creation and never reused.
     *
     * `type` distinguishes a pure return (refund or reject) from an
     * exchange — Phase 1 basic scope per planning/IMPLEMENTATION_MASTER_
     * PLAN.md's own "Phase: 1 (basic) / Phase 2 (exchanges)" split: the
     * exchange REQUEST itself (this record, its items, its status) is
     * built now; the "exchange-specific inventory reservation logic" that
     * document names as its own Future Extension Point is deliberately
     * not — see Models\ExchangeRequest's own docblock.
     *
     * `resolution` is set once inspection concludes (`refund`, `exchange`,
     * or `reject`) and is what Actions\ResolveReturnRequestAction reads to
     * decide whether to create a Models\RefundRequest or Models\
     * ExchangeRequest child row.
     *
     * `status` plus soft deletes implement DATA:LIFECYCLE. `lock_version`
     * implements DATA:VERSIONING. `tenant_id` implements ARCH:
     * DATA_OWNERSHIP's designed-in, unexercised tenant boundary. Return
     * records are Confidential per DATA:CLASSIFICATION, per this module's
     * own Data Ownership entry in the master plan.
     */
    public function up(): void
    {
        Schema::create('return_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');

            $table->uuid('order_id');
            $table->uuid('customer_id');
            $table->string('rma_number');

            $table->string('type')->default('return');
            $table->string('reason');
            $table->text('reason_details')->nullable();

            $table->string('status')->default('requested');
            $table->string('resolution')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->string('pickup_provider_code')->nullable();
            $table->string('pickup_tracking_number')->nullable();
            $table->timestamp('pickup_scheduled_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('inspection_started_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'rma_number']);
            $table->index(['order_id']);
            $table->index(['customer_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_requests');
    }
};
