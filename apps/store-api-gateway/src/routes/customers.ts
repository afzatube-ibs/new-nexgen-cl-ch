/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — the
 * Gateway's real composition of the backend's own new self-service
 * Customer auth surface (Commerce\Customers\Http\Controllers\
 * CustomerAuthController/CustomerSelfAddressController). Every route
 * here is a thin, honest relay through `CustomerBackendClient` (Category
 * C — see that module's own docblock) — no business logic, no password
 * verification, no token issuance happens in this Gateway; the real
 * backend does all of it.
 *
 * `register`/`login` are the two genuinely public routes (no incoming
 * token to forward). Every other route reads the caller's own bearer
 * token from this REQUEST's own `Authorization` header — set server-side
 * by the Storefront's own Next.js Route Handler, which is the only place
 * the real, httpOnly-cookie-held token is ever read — and forwards it
 * unchanged. A missing token on a protected route is not pre-checked
 * here (that would duplicate the real backend's own
 * `EnsureCustomerPrincipal` authorization logic, exactly what Rules §1
 * forbids) — it is simply forwarded as absent, and the real backend's own
 * 401 flows back through `toGatewayError`'s `unauthenticated` mapping.
 */
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { CustomerBackendClient } from '../backend/customerBackendClient.js';
import { bearerTokenFrom } from '../lib/auth.js';
import { toGatewayError, GatewayError } from '../lib/errors.js';

const registerBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  password_confirmation: z.string().min(1),
  phone: z.string().optional().nullable(),
});

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  device_name: z.string().min(1).default('storefront'),
});

const updateProfileBodySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  expected_version: z.number().int().min(1),
});

const addressBodySchema = z.object({
  label: z.string().optional().nullable(),
  recipient_name: z.string().min(1),
  phone: z.string().optional().nullable(),
  address_line1: z.string().min(1),
  address_line2: z.string().optional().nullable(),
  city: z.string().min(1),
  region: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country_code: z.string().length(2),
  is_default_shipping: z.boolean().optional(),
  is_default_billing: z.boolean().optional(),
  expected_version: z.number().int().min(1),
});

const updateAddressBodySchema = addressBodySchema.partial().extend({ expected_version: z.number().int().min(1) });

const expectedVersionBodySchema = z.object({ expected_version: z.number().int().min(1) });

export function registerCustomerRoutes(app: FastifyInstance, customerBackend: CustomerBackendClient, prefix: string): void {
  app.post(`${prefix}/customers/register`, async (request) => {
    const body = registerBodySchema.parse(request.body);
    try {
      const result = await customerBackend.post({ module: 'customers', path: 'customers/register', body, correlationId: request.id });
      return { data: (result as { data: unknown }).data, meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'customers');
    }
  });

  app.post(`${prefix}/customers/login`, async (request) => {
    const body = loginBodySchema.parse(request.body);
    try {
      const result = await customerBackend.post<{ data: unknown; meta: { token: string } }>({
        module: 'customers',
        path: 'customers/login',
        body,
        correlationId: request.id,
      });
      return { data: result.data, meta: { requestId: request.id, token: result.meta.token } };
    } catch (error) {
      throw toGatewayError(error, 'customers');
    }
  });

  app.post(`${prefix}/customers/logout`, async (request) => {
    const customerToken = bearerTokenFrom(request);
    try {
      await customerBackend.post({ module: 'customers', path: 'customers/logout', customerToken, correlationId: request.id });
      return { data: null, meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'customers');
    }
  });

  app.get(`${prefix}/customers/me`, async (request) => {
    const customerToken = bearerTokenFrom(request);
    if (!customerToken) throw GatewayError.unauthenticated();
    try {
      const result = await customerBackend.get({ module: 'customers', path: 'customers/me', customerToken, correlationId: request.id });
      return { data: (result as { data: unknown }).data, meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'customers');
    }
  });

  app.patch(`${prefix}/customers/me`, async (request) => {
    const customerToken = bearerTokenFrom(request);
    if (!customerToken) throw GatewayError.unauthenticated();
    const body = updateProfileBodySchema.parse(request.body);
    try {
      const result = await customerBackend.patch({ module: 'customers', path: 'customers/me', customerToken, body, correlationId: request.id });
      return { data: (result as { data: unknown }).data, meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'customers');
    }
  });

  app.get(`${prefix}/customers/me/addresses`, async (request) => {
    const customerToken = bearerTokenFrom(request);
    if (!customerToken) throw GatewayError.unauthenticated();
    try {
      const result = await customerBackend.get({ module: 'customers', path: 'customers/me/addresses', customerToken, correlationId: request.id });
      return { data: (result as { data: unknown }).data, meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'customers');
    }
  });

  app.post(`${prefix}/customers/me/addresses`, async (request) => {
    const customerToken = bearerTokenFrom(request);
    if (!customerToken) throw GatewayError.unauthenticated();
    const body = addressBodySchema.parse(request.body);
    try {
      const result = await customerBackend.post({ module: 'customers', path: 'customers/me/addresses', customerToken, body, correlationId: request.id });
      return { data: (result as { data: unknown }).data, meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'customers');
    }
  });

  app.patch(`${prefix}/customers/me/addresses/:addressId`, async (request) => {
    const { addressId } = z.object({ addressId: z.string().uuid() }).parse(request.params);
    const customerToken = bearerTokenFrom(request);
    if (!customerToken) throw GatewayError.unauthenticated();
    const body = updateAddressBodySchema.parse(request.body);
    try {
      const result = await customerBackend.patch({
        module: 'customers',
        path: `customers/me/addresses/${addressId}`,
        customerToken,
        body,
        correlationId: request.id,
      });
      return { data: (result as { data: unknown }).data, meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'customers');
    }
  });

  app.delete(`${prefix}/customers/me/addresses/:addressId`, async (request) => {
    const { addressId } = z.object({ addressId: z.string().uuid() }).parse(request.params);
    const customerToken = bearerTokenFrom(request);
    if (!customerToken) throw GatewayError.unauthenticated();
    const body = expectedVersionBodySchema.parse(request.body);
    try {
      const result = await customerBackend.delete({
        module: 'customers',
        path: `customers/me/addresses/${addressId}`,
        customerToken,
        body,
        correlationId: request.id,
      });
      return { data: (result as { data: unknown } | undefined)?.data ?? null, meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'customers');
    }
  });
}
