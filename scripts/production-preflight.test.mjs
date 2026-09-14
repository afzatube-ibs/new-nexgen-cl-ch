import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const script = join(root, 'scripts/production-preflight.mjs');
const directory = mkdtempSync(join(tmpdir(), 'nexgen-preflight-'));
const valid = {
  BACKEND_PUBLIC_URL: 'https://api.demo.test', GATEWAY_PUBLIC_URL: 'https://gateway.demo.test',
  STOREFRONT_PUBLIC_URL: 'https://shop.demo.test', ADMIN_PUBLIC_URL: 'https://admin.demo.test',
  BACKEND_CORS_ALLOWED_ORIGINS: 'https://admin.demo.test,https://shop.demo.test',
  APP_KEY: `base64:${Buffer.alloc(32, 'a').toString('base64')}`, DB_DATABASE: 'nexgen', DB_USERNAME: 'nexgen',
  DB_PASSWORD: 'database-password-1234567890-abcdef', DB_ROOT_PASSWORD: 'root-password-1234567890-abcdefgh',
  REDIS_PASSWORD: 'redis-password-1234567890-abcdefgh', GATEWAY_REDIS_URL: 'redis://:redis-password@redis:6379',
  GUEST_SESSION_SECRET: 'guest-session-secret-1234567890-abcdef', PREVIEW_TOKEN_SECRET: 'preview-token-secret-1234567890-abcdef',
  PAYMENTS_CHECKOUT_RETURN_URL: 'https://shop.demo.test/checkout/success', BKASH_SANDBOX: 'true',
  PAYMENTS_CALLBACK_BASE_URL: 'https://api.demo.test',
  BACKEND_SERVICE_TOKEN: '1|storefront-secret', BACKEND_CHECKOUT_SERVICE_TOKEN: '2|checkout-secret',
};

function writeEnv(name, values) {
  const path = join(directory, name);
  writeFileSync(path, Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n'));
  return path;
}

const validPath = writeEnv('valid.env', valid);
assert.match(execFileSync(process.execPath, [script, validPath], { encoding: 'utf8' }), /passed for launch/u);

const unsafePath = writeEnv('unsafe.env', {
  ...valid,
  STOREFRONT_PUBLIC_URL: 'https://lokkisona.com',
  BACKEND_CORS_ALLOWED_ORIGINS: '*,https://admin.demo.test',
  DEPLOYMENT_PROTECTED_ORIGINS: 'https://lokkisona.com',
  BKASH_APP_KEY: 'only-one-value',
});
const result = spawnSync(process.execPath, [script, unsafePath], { encoding: 'utf8' });
assert.equal(result.status, 1);
assert.match(result.stderr, /targets protected origin/u);
assert.match(result.stderr, /must not contain \*/u);
assert.match(result.stderr, /bKash credentials must be configured together/u);

const bootstrapPath = writeEnv('bootstrap.env', { ...valid, BACKEND_SERVICE_TOKEN: '', BACKEND_CHECKOUT_SERVICE_TOKEN: '' });
assert.match(execFileSync(process.execPath, [script, bootstrapPath, '--phase=bootstrap'], { encoding: 'utf8' }), /passed for bootstrap/u);

console.log('Production preflight tests passed.');
