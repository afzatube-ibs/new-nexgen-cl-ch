<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Role is a named, reusable bundle of permissions (SECURITY:
     * ROLES_PERMISSIONS) — genuinely admin-manageable, unlike Permission
     * (see create_permissions_table's docblock), since composing roles from
     * existing permissions is exactly the configuration surface
     * PRINCIPLES:OPERATIONAL_ACCESSIBILITY expects an operator to use
     * without engineering involvement.
     */
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('name');
            $table->string('label');
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
