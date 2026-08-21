/**
 * Flags plugin boundary — decorates `app.flags` with a `FlagEvaluator`
 * built from the static starter registry (`flags/definitions.ts`). No
 * other plugin may read/write flag state except through
 * `app.flags.evaluate(...)`.
 */
import type { FastifyInstance } from 'fastify';
import { FlagEvaluator } from '../flags/evaluator.js';
import { getFlagDefinitions } from '../flags/definitions.js';

declare module 'fastify' {
  interface FastifyInstance {
    flags: FlagEvaluator;
  }
}

export function registerFlagsPlugin(app: FastifyInstance): void {
  app.decorate('flags', new FlagEvaluator(getFlagDefinitions()));
}
