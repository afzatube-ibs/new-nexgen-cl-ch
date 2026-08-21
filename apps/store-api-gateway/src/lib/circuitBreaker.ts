/**
 * A minimal, per-dependency circuit breaker —
 * STORE_API_GATEWAY_ARCHITECTURE.md §3.2: "Each backend module the Gateway
 * calls... is wrapped in its own independent circuit breaker... so a
 * struggling Search index never degrades Checkout's own circuit." One
 * instance per named upstream dependency (§ backend/client.ts creates one
 * per module: catalog, search), never a single global breaker.
 *
 * Standard three-state design (closed → open → half-open), the same shape
 * every production circuit breaker implementation uses — chosen for its
 * proven simplicity over a heavier library, consistent with this
 * platform's own "no tool this repository doesn't yet need" discipline
 * (ADR-0009).
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Consecutive failures before the circuit trips open. */
  failureThreshold: number;
  /** How long the circuit stays open before allowing one trial request (half-open). */
  resetTimeoutMs: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  constructor(
    public readonly name: string,
    private readonly options: CircuitBreakerOptions,
  ) {}

  getState(): CircuitState {
    if (this.state === 'open' && this.openedAt !== null) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.options.resetTimeoutMs) {
        this.state = 'half-open';
      }
    }
    return this.state;
  }

  canProceed(): boolean {
    return this.getState() !== 'open';
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'closed';
    this.openedAt = null;
  }

  recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.options.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }
}
