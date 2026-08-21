import { vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import pino from 'pino';
import { BackendClient } from '../../src/backend/client.js';
import { buildTestServer } from '../../src/server.js';
import { resetEnvCacheForTests, loadEnv, type Env } from '../../src/config/env.js';

const silentLogger = pino({ level: 'silent' });

export function testEnv(overrides: Partial<Record<string, string>> = {}): Env {
  resetEnvCacheForTests();
  return loadEnv({
    BACKEND_BASE_URL: 'http://backend.test/api/v1',
    BACKEND_SERVICE_TOKEN: 'test-service-token',
    GUEST_SESSION_SECRET: 'x'.repeat(32),
    PREVIEW_TOKEN_SECRET: 'y'.repeat(32),
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    RATE_LIMIT_MAX: '5',
    RATE_LIMIT_WINDOW_MS: '60000',
    ...overrides,
  });
}

/**
 * Stubs global fetch with a routing table keyed by a substring of the
 * requested URL — realistic enough to exercise BackendClient's own real
 * request-building/error-handling logic (this is NOT mocking BackendClient
 * itself, only the network boundary beneath it), matching this project's
 * own established "mock the network edge, not the module" testing
 * convention (see apps/admin/e2e/mocks.ts's identical MSW-based precedent).
 */
export function stubBackendFetch(routes: Array<{ match: string; status: number; body: unknown }>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = String(input);
      const route = routes.find((r) => url.includes(r.match));
      if (!route) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'no stub matched' }), { status: 404 }));
      }
      return new Response(JSON.stringify(route.body), { status: route.status, headers: { 'content-type': 'application/json' } });
    }),
  );
}

export async function buildTestApp(env: Env): Promise<FastifyInstance> {
  const backend = new BackendClient({ baseUrl: env.BACKEND_BASE_URL, serviceToken: env.BACKEND_SERVICE_TOKEN, logger: silentLogger });
  return buildTestServer(env, backend);
}
