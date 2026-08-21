/**
 * DestinationRegistry — the Factory/Registry/Resolver shape CDP_ARCHITECTURE.md
 * §5.1 names explicitly, mirroring the real backend's own
 * `Gateways\GatewayRegistry` (Payments) and `Engines\SearchEngineRegistry`
 * (Search) precedent. Registering a destination here is the entire
 * integration surface a future adapter needs — the Event Pipeline
 * (events/pipeline.ts) only ever calls `registry.availableDestinations()`,
 * never a destination-specific branch.
 */
import type { DestinationContract } from './contract.js';

export class DestinationRegistry {
  private readonly destinations = new Map<string, DestinationContract>();

  register(destination: DestinationContract): void {
    this.destinations.set(destination.id, destination);
  }

  get(id: string): DestinationContract | undefined {
    return this.destinations.get(id);
  }

  all(): DestinationContract[] {
    return [...this.destinations.values()];
  }

  /** Only destinations whose own `isAvailable()` (credential-gated, per the contract) currently returns true. */
  availableDestinations(): DestinationContract[] {
    return this.all().filter((destination) => destination.isAvailable());
  }
}
