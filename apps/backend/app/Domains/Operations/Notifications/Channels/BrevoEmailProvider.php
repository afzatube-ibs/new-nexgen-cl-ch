<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Channels;

use App\Domains\Operations\Notifications\Channels\Contracts\NotificationProviderContract;
use App\Domains\Operations\Notifications\Channels\Support\NotificationSendRequest;
use App\Domains\Operations\Notifications\Channels\Support\NotificationSendResult;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Http\Client\Factory as HttpFactory;

/**
 * Brevo (formerly Sendinblue) — integrated through its real, documented
 * transactional email API (`POST /v3/smtp/email`, `api-key` header
 * authentication), per this module's Bangladesh-first "Brevo" entry.
 */
final readonly class BrevoEmailProvider implements NotificationProviderContract
{
    private const string BASE_URL = 'https://api.brevo.com/v3';

    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(
        private array $config,
        private HttpFactory $http,
    ) {}

    public function code(): string
    {
        return 'brevo';
    }

    public function label(): string
    {
        return 'Brevo';
    }

    public function channel(): string
    {
        return NotificationTemplate::CHANNEL_EMAIL;
    }

    public function isAvailable(): bool
    {
        return filled($this->config['api_key'] ?? null)
            && filled($this->config['from_address'] ?? null);
    }

    public function send(NotificationSendRequest $request): NotificationSendResult
    {
        $response = $this->http
            ->withHeaders(['api-key' => (string) $this->config['api_key']])
            ->asJson()
            ->post(self::BASE_URL.'/smtp/email', [
                'sender' => array_filter([
                    'email' => (string) $this->config['from_address'],
                    'name' => $this->config['from_name'] ?? null,
                ]),
                'to' => [['email' => $request->recipient]],
                'subject' => $request->subject ?? '',
                'htmlContent' => $request->body,
            ]);

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];

        if ($response->failed()) {
            return new NotificationSendResult(
                status: 'failed',
                providerReference: null,
                raw: $body,
                failureReason: is_string($body['message'] ?? null) ? $body['message'] : "Brevo returned HTTP {$response->status()}.",
            );
        }

        return new NotificationSendResult(
            status: 'succeeded',
            providerReference: is_string($body['messageId'] ?? null) ? $body['messageId'] : null,
            raw: $body,
        );
    }
}
