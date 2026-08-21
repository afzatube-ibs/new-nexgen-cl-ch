import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, testEnv } from './testUtils.js';

describe('routes/health (integration)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /health/live always returns 200, independent of any dependency', async () => {
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'alive' });
    await app.close();
  });

  it('GET /health/ready reports ready when the (in-memory, test) cache is available', async () => {
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(response.statusCode).toBe(200);
    expect(response.json().dependencies.cache).toBe('up');
    await app.close();
  });

  it('GET /health reports circuit state per backend module', async () => {
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.dependencies.backendCatalogCircuit).toBe('closed');
    expect(body.dependencies.backendSearchCircuit).toBe('closed');
    await app.close();
  });
});
