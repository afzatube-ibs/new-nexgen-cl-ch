<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A distinct aggregate root, not a status field on ReturnRequest — per
     * DATA:AGGREGATE_BOUNDARIES ("drawn around the smallest set of data
     * that genuinely must be consistent at every moment"): a
     * RefundRequest's own status changes on a different trigger (Payments'
     * async `PaymentRefunded` event, via app/Listeners/
     * CompleteRefundOnPaymentRefunded.php) than ReturnRequest's own status
     * changes (operator actions), so it earns its own consistency
     * boundary and its own `lock_version` rather than sharing
     * ReturnRequest's.
     *
     * `return_request_id` is a real foreign key (same aggregate FAMILY,
     * both owned by Returns — restrictOnDelete since a RefundRequest must
     * never be orphaned). `payment_id` references Payments' own Payment by
     * identifier only, never a foreign key, per ARCH:CROSS_DOMAIN_
     * COMMUNICATION — Returns (Operations) never queries or writes
     * Payments' (Commerce) data directly; the actual refund execution and
     * its `gateway_reference` arrive back only via PaymentRefunded, which
     * this table's own `status`/`gateway_reference`/`failed_reason`
     * columns record. This is the concrete mechanism behind the master
     * plan's own acceptance criterion: "A refund never occurs without an
     * associated Payments module transaction reference" — `payment_id`
     * plus `gateway_reference` together ARE that reference.
     *
     * `status` implements DATA:LIFECYCLE at the business level (pending ->
     * processing -> completed/failed) — no soft delete: a RefundRequest,
     * once it exists, is a permanent financial record per DATA:RETENTION,
     * never deleted.
     */
    public function up(): void
    {
        Schema::create('refund_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('return_request_id');
            $table->uuid('payment_id');
            $table->decimal('amount', 14, 4);
            $table->char('currency_code', 3);
            $table->string('status')->default('pending');
            $table->string('gateway_reference')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamp('requested_at');
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();

            $table->foreign('return_request_id')->references('id')->on('return_requests')->restrictOnDelete();
            $table->index('return_request_id');
            $table->index('payment_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refund_requests');
    }
};
