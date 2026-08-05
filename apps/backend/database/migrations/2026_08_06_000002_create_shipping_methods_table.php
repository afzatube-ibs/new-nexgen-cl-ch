<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A named shipping service level a store offers (e.g. "Standard",
     * "Express", "Overnight") — the exact concept Checkout's
     * Support\ShippingOptionCatalog stands in for today (see that class's
     * docblock: "the exact seam a future Shipping & Logistics module
     * replaces"). `code` is the stable, human-assignable identifier a rate
     * (shipping_rates) and, eventually, an order line reference — distinct
     * from `id` per DATA:ENTITY_IDENTITY ("identity ... must never encode
     * business meaning"); `code` is a label, not an identity.
     *
     * `provider_code` optionally names which registered Couriers\
     * ProviderRegistry entry fulfills this method (e.g. 'steadfast',
     * 'pathao') — null means this method is self-fulfilled / manually
     * dispatched, exactly like Couriers\ManualProvider, which is always
     * available and requires no external integration. Deliberately NOT a
     * foreign key: providers are code-and-config-defined (config/
     * shipping.php), not database rows, mirroring Payments' own
     * Gateways\GatewayRegistry, which is built from config('payments.
     * gateways') rather than a gateways table — see that module's
     * PaymentsServiceProvider docblock for the identical rationale applied
     * here.
     *
     * `status` plus soft deletes implement DATA:LIFECYCLE. `lock_version`
     * implements DATA:VERSIONING. `tenant_id` implements ARCH:
     * DATA_OWNERSHIP's designed-in, unexercised tenant boundary.
     */
    public function up(): void
    {
        Schema::create('shipping_methods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('code');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('provider_code')->nullable();
            $table->string('status')->default('active');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index('status');
            $table->index('provider_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_methods');
    }
};
