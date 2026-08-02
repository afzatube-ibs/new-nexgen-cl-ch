<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Permission corresponds to one specific operation a module exposes
     * through its public contract (SECURITY:ROLES_PERMISSIONS: "a module
     * that adds a new capability is responsible for defining the permission
     * that guards it, since only that module's owning team genuinely knows
     * what the operation does"). Permissions are therefore code-registered
     * — declared by each module's own PermissionRegistry entries and synced
     * into this table by `php artisan identity-access:sync-permissions`
     * (see Console\Commands\SyncPermissionsCommand) — never admin-created
     * from the API. Only Role composition (which permissions a role
     * bundles) is admin-manageable; the catalog of what permissions exist
     * is not, because an admin-invented permission string would correspond
     * to no actual enforced code path.
     *
     * No tenant_id: unlike Role/User, the permission catalog itself
     * describes what operations the *installed code* exposes, which is the
     * same for every tenant on a shared installation — only role
     * composition and user assignment are tenant-scoped.
     */
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key')->unique();
            $table->string('label');
            $table->string('module');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
