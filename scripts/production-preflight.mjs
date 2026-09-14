#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const envPath = args.find((arg) => !arg.startsWith('--')) ?? '.env.production';
const phaseArg = args.find((arg) => arg.startsWith('--phase='));
const phase = phaseArg?.split('=', 2)[1] ?? 'launch';

if (!['bootstrap', 'launch'].includes(phase)) {
  console.error('Production preflight failed:\n- --phase must be bootstrap or launch.');
  process.exit(1);
}

function parseEnv(source) {
  const parsed = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    parsed[key] = value;
  }
  return parsed;
}

let env;
try {
  env = parseEnv(readFileSync(envPath, 'utf8'));
} catch (error) {
  console.error(`Production preflight failed:\n- Cannot read ${envPath}: ${error.message}`);
  process.exit(1);
}

const errors = [];
const required = [
  'BACKEND_PUBLIC_URL', 'GATEWAY_PUBLIC_URL', 'STOREFRONT_PUBLIC_URL', 'ADMIN_PUBLIC_URL', 'BACKEND_CORS_ALLOWED_ORIGINS',
  'APP_KEY', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD', 'DB_ROOT_PASSWORD', 'REDIS_PASSWORD', 'GATEWAY_REDIS_URL',
  'GUEST_SESSION_SECRET', 'PREVIEW_TOKEN_SECRET', 'PAYMENTS_CHECKOUT_RETURN_URL', 'PAYMENTS_CALLBACK_BASE_URL',
];

for (const key of required) {
  if (!env[key]) errors.push(`${key} is required.`);
}

for (const [key, value] of Object.entries(env)) {
  if (/REPLACE_|\.example\.com(?:\/|$)/iu.test(value)) errors.push(`${key} still contains an example or placeholder value.`);
}

const publicUrlKeys = ['BACKEND_PUBLIC_URL', 'GATEWAY_PUBLIC_URL', 'STOREFRONT_PUBLIC_URL', 'ADMIN_PUBLIC_URL'];
const origins = new Map();
for (const key of publicUrlKeys) {
  if (!env[key]) continue;
  try {
    const url = new URL(env[key]);
    if (url.protocol !== 'https:' && env.PREFLIGHT_ALLOW_HTTP !== 'true') errors.push(`${key} must use HTTPS.`);
    if (url.pathname !== '/' || url.search || url.hash) errors.push(`${key} must be an origin without a path, query, or fragment.`);
    if (origins.has(url.origin)) errors.push(`${key} must not share an origin with ${origins.get(url.origin)}.`);
    origins.set(url.origin, key);
  } catch {
    errors.push(`${key} must be a valid absolute URL.`);
  }
}

const protectedOrigins = (env.DEPLOYMENT_PROTECTED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
for (const protectedValue of protectedOrigins) {
  try {
    const protectedOrigin = new URL(protectedValue).origin;
    if (origins.has(protectedOrigin)) errors.push(`${origins.get(protectedOrigin)} targets protected origin ${protectedOrigin}.`);
  } catch {
    errors.push('DEPLOYMENT_PROTECTED_ORIGINS contains an invalid URL.');
  }
}

const corsOrigins = new Set((env.BACKEND_CORS_ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean));
for (const key of ['ADMIN_PUBLIC_URL', 'STOREFRONT_PUBLIC_URL']) {
  if (env[key] && !corsOrigins.has(env[key])) errors.push(`BACKEND_CORS_ALLOWED_ORIGINS must include ${key}.`);
}
if (corsOrigins.has('*')) errors.push('BACKEND_CORS_ALLOWED_ORIGINS must not contain * in production.');

try {
  if (env.PAYMENTS_CHECKOUT_RETURN_URL && env.STOREFRONT_PUBLIC_URL && new URL(env.PAYMENTS_CHECKOUT_RETURN_URL).origin !== new URL(env.STOREFRONT_PUBLIC_URL).origin) {
    errors.push('PAYMENTS_CHECKOUT_RETURN_URL must use the Storefront origin.');
  }
} catch {
  errors.push('PAYMENTS_CHECKOUT_RETURN_URL must be a valid absolute URL.');
}

try {
  if (env.PAYMENTS_CALLBACK_BASE_URL && env.BACKEND_PUBLIC_URL && new URL(env.PAYMENTS_CALLBACK_BASE_URL).origin !== new URL(env.BACKEND_PUBLIC_URL).origin) {
    errors.push('PAYMENTS_CALLBACK_BASE_URL must use the Backend origin.');
  }
} catch {
  errors.push('PAYMENTS_CALLBACK_BASE_URL must be a valid absolute URL.');
}

for (const key of ['DB_PASSWORD', 'DB_ROOT_PASSWORD', 'REDIS_PASSWORD', 'GUEST_SESSION_SECRET', 'PREVIEW_TOKEN_SECRET']) {
  if (env[key] && env[key].length < 32) errors.push(`${key} must contain at least 32 characters.`);
}
if (env.DB_PASSWORD && env.DB_ROOT_PASSWORD && env.DB_PASSWORD === env.DB_ROOT_PASSWORD) errors.push('DB_PASSWORD and DB_ROOT_PASSWORD must be different.');
if (env.GUEST_SESSION_SECRET && env.PREVIEW_TOKEN_SECRET && env.GUEST_SESSION_SECRET === env.PREVIEW_TOKEN_SECRET) errors.push('GUEST_SESSION_SECRET and PREVIEW_TOKEN_SECRET must be different.');

if (env.APP_KEY) {
  const encoded = env.APP_KEY.startsWith('base64:') ? env.APP_KEY.slice(7) : '';
  if (!encoded || Buffer.from(encoded, 'base64').length !== 32) errors.push('APP_KEY must be a Laravel base64 key containing exactly 32 decoded bytes.');
}

const bkashKeys = ['BKASH_APP_KEY', 'BKASH_APP_SECRET', 'BKASH_USERNAME', 'BKASH_PASSWORD'];
const configuredBkashKeys = bkashKeys.filter((key) => Boolean(env[key]));
if (configuredBkashKeys.length > 0 && configuredBkashKeys.length !== bkashKeys.length) errors.push('bKash credentials must be configured together or all left blank.');
if (env.BKASH_SANDBOX && !['true', 'false'].includes(env.BKASH_SANDBOX)) errors.push('BKASH_SANDBOX must be true or false.');

if (phase === 'launch') {
  for (const key of ['BACKEND_SERVICE_TOKEN', 'BACKEND_CHECKOUT_SERVICE_TOKEN']) {
    if (!env[key] || !/^\d+\|\S+$/u.test(env[key])) errors.push(`${key} must contain a provisioned Sanctum token before launch.`);
  }
}

if (errors.length) {
  console.error(`Production preflight failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Production preflight passed for ${phase} phase (${envPath}).`);
