<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_rates', function (Blueprint $table) {
            $table->decimal('min_order_amount', 12, 4)->default(0)->after('max_weight_grams');
            $table->decimal('max_order_amount', 12, 4)->nullable()->after('min_order_amount');
            $table->dropUnique('shipping_rates_zone_method_band_unique');
            $table->unique(
                ['shipping_zone_id', 'shipping_method_id', 'min_weight_grams', 'min_order_amount'],
                'shipping_rates_zone_method_weight_amount_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::table('shipping_rates', function (Blueprint $table) {
            $table->dropUnique('shipping_rates_zone_method_weight_amount_unique');
            $table->dropColumn(['min_order_amount', 'max_order_amount']);
            $table->unique(
                ['shipping_zone_id', 'shipping_method_id', 'min_weight_grams'],
                'shipping_rates_zone_method_band_unique',
            );
        });
    }
};
