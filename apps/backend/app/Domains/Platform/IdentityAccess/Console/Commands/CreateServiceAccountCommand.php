<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Console\Commands;

use App\Domains\Platform\IdentityAccess\Actions\AssignRoleAction;
use App\Domains\Platform\IdentityAccess\Actions\RegisterUserAction;
use App\Domains\Platform\IdentityAccess\Models\Role;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * neXgen Production Sprint — Milestone 2, real production-configuration
 * fix. Mirrors CreateAdminCommand's own established pattern exactly, for
 * the identical reason: a real credential (here, a Sanctum API token,
 * there, a login password) can never be shipped as a seeded default per
 * SECURITY:SECURE_CONFIGURATION, so provisioning one is a CLI command an
 * operator runs once per environment, never automatic seed data.
 *
 * `ServiceAccountRoleSeeder` (run automatically by `db:seed`) already
 * creates the real `storefront-service`/`checkout-service` roles with
 * their real, complete permission sets — this command's own job is
 * narrower: create (or reuse) the one real User that holds a given role,
 * and issue a real, freshly-generated Sanctum token for it. The plain-
 * text token is shown exactly once, on this command's own output, never
 * stored anywhere in plain text (Sanctum itself only ever persists its
 * hash) — the operator copies it into the Store API Gateway's own
 * `BACKEND_SERVICE_TOKEN` (for `storefront-service`) or `BACKEND_
 * CHECKOUT_SERVICE_TOKEN` (for `checkout-service`), per that service's
 * own `.env.example`.
 *
 * Automation may use `--token-only` to receive exactly the issued token
 * and no human-readable status prose. This exists specifically so
 * bootstrap/deployment tooling never has to scrape console formatting.
 *
 * Safe to re-run against an environment that already has a real service
 * account for a given role: it reuses the existing User (matched by
 * email) rather than creating a duplicate, and issues one additional
 * real token without revoking any token already in use — an operator
 * rotating credentials runs this again, updates the Gateway's `.env`,
 * then separately revokes the old token once the new one is confirmed
 * working (`$user->tokens()->where('name', ...)->delete()`, or via a
 * future dedicated revoke command — deliberately not built here, since
 * this command's own scope is provisioning, not rotation).
 */
final class CreateServiceAccountCommand extends Command
{
    protected $signature = 'identity-access:create-service-account
        {role : The service role name (storefront-service or checkout-service — must already exist; run `php artisan db:seed` first)}
        {--email= : Email identifying the service account (defaults to "{role}@service.local")}
        {--name= : Display name for the service account (defaults to a title-cased version of the role name)}
        {--token-name=gateway : Name recorded on the issued Sanctum token, for later identification in an audit or revocation}
        {--token-only : Output only the newly-issued plain-text token, for deployment automation}';

    protected $description = 'Provision a real Store API Gateway service account (or reuse an existing one) and issue a real Sanctum token to put in the Gateway\'s own .env.';

    public function handle(RegisterUserAction $registerUserAction, AssignRoleAction $assignRoleAction): int
    {
        $roleName = (string) $this->argument('role');
        $role = Role::query()->where('name', $roleName)->first();

        if ($role === null) {
            $this->error("The \"{$roleName}\" role does not exist yet. Run `php artisan db:seed` first (see ServiceAccountRoleSeeder).");

            return self::FAILURE;
        }

        $tokenOnly = (bool) $this->option('token-only');
        $email = $this->option('email') ?? "{$roleName}@service.local";
        $name = $this->option('name') ?? Str::headline($roleName);

        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            // A service account never logs in interactively — only its
            // real Sanctum token is ever used — so a real, random,
            // never-displayed password satisfies the column's own
            // NOT NULL constraint without this command ever needing to
            // invent or store one anyone could actually use to log in.
            $user = $registerUserAction->execute($name, $email, Str::random(40), actorId: null);

            if (! $tokenOnly) {
                $this->info("Created service account user: {$user->email}");
            }
        } elseif (! $tokenOnly) {
            $this->info("Reusing existing service account user: {$user->email}");
        }

        $assignRoleAction->execute($user, $role, actorId: null);

        $tokenName = (string) $this->option('token-name');
        $plainTextToken = $user->createToken($tokenName)->plainTextToken;

        if ($tokenOnly) {
            $this->line($plainTextToken);

            return self::SUCCESS;
        }

        $this->newLine();
        $this->info("Real Sanctum token issued for role \"{$roleName}\" — shown once, copy it now:");
        $this->line($plainTextToken);
        $this->newLine();
        $this->line('Put this in the Store API Gateway\'s own .env as BACKEND_SERVICE_TOKEN (storefront-service) or BACKEND_CHECKOUT_SERVICE_TOKEN (checkout-service).');

        return self::SUCCESS;
    }
}
