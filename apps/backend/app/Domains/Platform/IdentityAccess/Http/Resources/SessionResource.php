<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * A "session" in this module's vocabulary (SECURITY:SESSION_MANAGEMENT) —
 * see RevokeSessionAction's docblock. Never exposes the token's hashed
 * secret; only enough for a person to recognize and choose to revoke it.
 *
 * @mixin PersonalAccessToken
 */
final class SessionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'deviceName' => $this->name,
            'abilities' => $this->abilities,
            'lastUsedAt' => $this->last_used_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
            'isCurrent' => $this->isCurrentToken($request),
        ];
    }

    private function isCurrentToken(Request $request): bool
    {
        $currentToken = $request->user()?->currentAccessToken();

        if (! $currentToken instanceof PersonalAccessToken) {
            // A request authenticated via a route model binding rather
            // than the bearer token itself (e.g. Sanctum's stateful SPA
            // cookie mode) has no discrete "current token" to compare
            // against — every listed session is then correctly "not
            // current" rather than one being guessed at.
            return false;
        }

        return (string) $currentToken->id === (string) $this->id;
    }
}
