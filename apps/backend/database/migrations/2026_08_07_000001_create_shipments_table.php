<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:FULFILLMENT's aggregate root — "owns the record of what has
     * been picked, packed, and shipped against an order," per
     * docs/04_MODULE_ARCHITECTURE.md. Reacts to Orders' `OrderPlaced`
     * event (see app/Listeners/CreateShipmentOnOrderPlaced.php) rather than
     * depending on Orders' own data — `order_id`/`order_number`/
     * `customer_id`/`grand_total`/`currency_code` below are a one-time
     * snapshot of exactly what that event carries, never a foreign key,
     * mirroring Payments' identically-reasoned `payment_attempts.order_id`
     * (see that migration's docblock) and this platform's stricter,
     * explicit acceptance criterion for this module: "Fulfillment never
     * depends on Orders' internal data directly — only on the OrderPlaced
     * event."
     *
     * `shipping_method_id` similarly references Shipping's own
     * ShippingMethod by identifier only, never a foreign key — Shipping
     * and Fulfillment are both Operations-domain modules, so Fulfillment's
     * own Actions may read that record directly (a same-domain "direct
     * call," per MODULE:INTERACTION_RULES, mirroring Payments' own narrow
     * same-domain read of Orders' `grand_total`), but DATA:CROSS_MODULE_
     * ACCESS still forbids a schema-level FK across module-owned tables
     * regardless of domain — confirmed by `payment_attempts.order_id`
     * carrying no FK even though Payments and Orders share the Commerce
     * domain.
     *
     * Destination and weight are operator-supplied (`Actions\
     * SetShipmentDestinationAction`, part of this module's own "manual
     * fulfillment actions" Public Contract, per the master plan's
     * Fulfillment entry) rather than derived from Order internals, for the
     * same reason — OrderPlaced does not carry a shipping address or line
     * items, and this module has no other lawful way to obtain them.
     *
     * `status` implements this module's own Shipment Status Lifecycle
     * (`DATA:LIFECYCLE` applied at the business level; soft delete below
     * implements the generic Active/Archived/Deleted framing). `lock_
     * version` implements DATA:VERSIONING. `tenant_id` implements ARCH:
     * DATA_OWNERSHIP's designed-in, unexercised tenant boundary. Fulfillment
     * records are Operational per DATA:CLASSIFICATION, matching this
     * module's own Data Ownership entry in the master plan.
     */
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');

            $table->uuid('order_id');
            $table->string('order_number');
            $table->uuid('customer_id');
            $table->decimal('grand_total', 14, 4)->nullable();
            $table->char('currency_code', 3)->nullable();

            $table->uuid('shipping_method_id')->nullable();
            $table->string('courier_provider_code')->nullable();
            $table->string('courier_consignment_id')->nullable();
            $table->string('tracking_number')->nullable();
            $table->string('label_url')->nullable();

            $table->string('destination_recipient_name')->nullable();
            $table->string('destination_phone')->nullable();
            $table->string('destination_address_line1')->nullable();
            $table->string('destination_address_line2')->nullable();
            $table->string('destination_city')->nullable();
            $table->string('destination_region')->nullable();
            $table->string('destination_postal_code')->nullable();
            $table->char('destination_country_code', 2)->nullable();

            $table->unsignedInteger('weight_grams')->nullable();

            $table->string('status')->default('pending');
            $table->text('failure_reason')->nullable();

            $table->timestamp('picked_at')->nullable();
            $table->timestamp('packed_at')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            // One shipment per order in this Phase 1 "basic" scope — a
            // split-shipment (one order, multiple parcels) is a real
            // future need but not one named in this module's Phase 1
            // acceptance criteria; the unique constraint keeps
            // Actions\CreateShipmentFromOrderPlacedAction's idempotency
            // guard enforceable at the database level, not just in
            // application code.
            $table->unique(['tenant_id', 'order_id']);
            $table->index('status');
            $table->index('tracking_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
