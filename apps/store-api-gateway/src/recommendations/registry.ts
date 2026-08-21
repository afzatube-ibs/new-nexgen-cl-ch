/**
 * RecommendationEngineRegistry — resolves which registered engine actually
 * serves a given slot, first-registered-that-supports-it wins (a future
 * real ML engine registered ahead of the fallback simply pre-empts it for
 * the slots it covers, no route-level change required).
 */
import type { RecommendationEngineContract, RecommendationSlot } from './contract.js';

export class RecommendationEngineRegistry {
  private readonly engines: RecommendationEngineContract[] = [];

  register(engine: RecommendationEngineContract): void {
    this.engines.push(engine);
  }

  resolve(slot: RecommendationSlot): RecommendationEngineContract | undefined {
    return this.engines.find((engine) => engine.supportedSlots.includes(slot));
  }
}
