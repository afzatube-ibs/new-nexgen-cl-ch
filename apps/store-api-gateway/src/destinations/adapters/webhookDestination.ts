/**
 * Custom Webhook destination — CDP_ARCHITECTURE.md §5.2: "a merchant- or
 * agency-configured outbound HTTP endpoint receiving the raw `CdpEvent`
 * JSON... the direct mechanism a future Marketplace app... would use to
 * receive behavioral events." Real and functional — no external
 * credentials required, only a configured URL, so this is the one
 * destination this slice can deliver end-to-end for real.
 */
import type { DestinationContract, DeliveryResult } from '../contract.js';
import type { CdpEvent } from '../../events/types.js';

export function createWebhookDestination(id: string, url: string | undefined, timeoutMs = 5000): DestinationContract {
  return {
    id,
    isAvailable: () => Boolean(url),
    async send(event: CdpEvent): Promise<DeliveryResult> {
      if (!url) return { delivered: false, reason: 'not_configured' };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Event-Id': event.eventId },
          body: JSON.stringify(event),
          signal: controller.signal,
        });
        if (!response.ok) return { delivered: false, reason: `http_${response.status}` };
        return { delivered: true };
      } catch (error) {
        const isAbort = error instanceof Error && error.name === 'AbortError';
        return { delivered: false, reason: isAbort ? 'timeout' : 'network_error' };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
