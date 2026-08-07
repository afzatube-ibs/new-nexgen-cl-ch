<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Channels;

use App\Domains\Operations\Notifications\Channels\Contracts\NotificationProviderContract;
use App\Domains\Operations\Notifications\Channels\Support\NotificationSendRequest;
use App\Domains\Operations\Notifications\Channels\Support\NotificationSendResult;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Http\Client\Factory as HttpFactory;

/**
 * Mailgun — integrated through its real, documented Messages API
 * (`POST /v3/{domain}/messages`, HTTP Basic auth with the literal
 * username `api` and the account's API key), per this module's
 * Bangladesh-first "Mailgun" entry.
 */
final readonly class MailgunEmailProvider implements NotificationProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(
        private array $config,
        private HttpFactory $http,
    ) {}

    public function code(): string
    {
        return 'mailgun';
    }

    public function label(): string
    {
        return 'Mailgun';
    }

    public function channel(): string
    {
        return NotificationTemplate::CHANNEL_EMAIL;
    }

    public function isAvailable(): bool
    {
        return filled($this->config['api_key'] ?? null)
            && filled($this->config['domain'] ?? null)
            && filled($this->config['from_address'] ?? null);
    }

    public function send(NotificationSendRequest $request): NotificationSendResult
    {
        $response = $this->http
            ->asForm()
            ->withBasicAuth('api', (string) $this->config['api_key'])
            ->post($this->baseUrl().'/messages', [
                'from' => $this->fromAddress(),
                'to' => $request->recipient,
                'subject' => $request->subject ?? '',
                'html' => $request->body,
            ]);

        /** @var array<string, mixed> $body */
        $body = $response->json() ?? [];

        if ($response->failed()) {
            return new NotificationSendResult(
                status: 'failed',
                providerReference: null,
                raw: $body,
                failureReason: is_string($body['message'] ?? null) ? $body['message'] : "Mailgun returned HTTP {$response->status()}.",
            );
        }

        return new NotificationSendResult(
            status: 'succeeded',
            providerReference: is_string($body['id'] ?? null) ? $body['id'] : null,
            raw: $body,
        );
    }

    private function baseUrl(): string
    {
        $region = $this->config['region'] ?? 'us';
        $base = $region === 'eu' ? 'https://api.eu.mailgun.net/v3' : 'https://api.mailgun.net/v3';

        return "{$base}/{$this->config['domain']}";
    }

    private function fromAddress(): string
    {
        $name = $this->config['from_name'] ?? null;
        $address = (string) $this->config['from_address'];

        return filled($name) ? "{$name} <{$address}>" : $address;
    }
}
