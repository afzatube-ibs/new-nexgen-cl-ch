<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Console\Commands;

use App\Domains\Platform\IdentityAccess\Actions\AssignRoleAction;
use App\Domains\Platform\IdentityAccess\Actions\RegisterUserAction;
use App\Domains\Platform\IdentityAccess\Models\Role;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * Bootstraps the first operator account with the Administrator role.
 *
 * This is deliberately a CLI command, not an API endpoint or a seeder: per
 * SECURITY:SECURE_CONFIGURATION, the platform's default configuration must
 * be secure without an operator needing to know what to change, which rules
 * out ever shipping a default admin account with a known password. Password
 * is always interactively prompted (hidden input, never echoed, never
 * accepted as a plain command-line argument that would land in shell
 * history) unless --password is explicitly supplied for scripted/CI use.
 *
 * The full guided first-run setup experience (04_MODULE_ARCHITECTURE
 * module 9, "Installer") is a separate, not-yet-built module that will
 * eventually orchestrate this same capability behind a web wizard — this
 * command is the capability itself, usable standalone until that exists.
 */
final class CreateAdminCommand extends Command
{
    protected $signature = 'identity-access:create-admin
        {--name= : The administrator\'s display name}
        {--email= : The administrator\'s email address}
        {--password= : The administrator\'s password (prompted securely if omitted)}';

    protected $description = 'Create the first administrator account and assign the Administrator role.';

    public function handle(RegisterUserAction $registerUserAction, AssignRoleAction $assignRoleAction): int
    {
        $role = Role::query()->where('name', 'administrator')->first();

        if ($role === null) {
            $this->error('The "administrator" role does not exist yet. Run `php artisan db:seed` first.');

            return self::FAILURE;
        }

        $name = $this->option('name') ?? $this->ask('Administrator name');
        $email = $this->option('email') ?? $this->ask('Administrator email');
        $password = $this->option('password') ?? $this->secret('Administrator password');

        $validator = Validator::make(
            ['name' => $name, 'email' => $email, 'password' => $password],
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'password' => ['required', Password::min(12)->mixedCase()->numbers()->symbols()],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = $registerUserAction->execute($name, $email, $password, actorId: null);
        $assignRoleAction->execute($user, $role, actorId: null);

        $this->info("Administrator account created: {$user->email}");

        return self::SUCCESS;
    }
}
