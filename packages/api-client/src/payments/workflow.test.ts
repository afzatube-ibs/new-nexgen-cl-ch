import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { capturePayment, cancelPayment, voidPayment, attachBankTransferProof, approveBankTransfer, rejectBankTransfer } from './workflow.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('payments workflow', () => {
  const fetchMock = vi.fn();
  let client: ApiClient;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('capturePayment() posts to the real capture endpoint with expected_version only — no amount override', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'p1', status: 'captured' } }));
    await capturePayment(client, 'p1', { expectedVersion: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments/p1/capture');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('cancelPayment() requires and sends a real reason', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'p1', status: 'cancelled' } }));
    await cancelPayment(client, 'p1', { reason: 'Customer changed their mind.', expectedVersion: 2 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments/p1/cancel');
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Customer changed their mind.', expected_version: 2 });
  });

  it('voidPayment() requires and sends a real reason', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'p1', status: 'voided' } }));
    await voidPayment(client, 'p1', { reason: 'Authorization expired at the gateway.', expectedVersion: 3 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments/p1/void');
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Authorization expired at the gateway.', expected_version: 3 });
  });

  it('attachBankTransferProof() sends the real proof_reference field', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'p1', proofReference: 'media-file-123' } }));
    await attachBankTransferProof(client, 'p1', { proofReference: 'media-file-123', expectedVersion: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments/p1/bank-transfer/proof');
    expect(JSON.parse(init.body as string)).toEqual({ proof_reference: 'media-file-123', expected_version: 1 });
  });

  it('approveBankTransfer() posts to the real approve endpoint with expected_version only', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'p1', status: 'captured' } }));
    await approveBankTransfer(client, 'p1', { expectedVersion: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments/p1/bank-transfer/approve');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('rejectBankTransfer() requires and sends a real reason', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'p1', status: 'failed' } }));
    await rejectBankTransfer(client, 'p1', { reason: 'No matching transfer found for this reference.', expectedVersion: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments/p1/bank-transfer/reject');
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'No matching transfer found for this reference.', expected_version: 1 });
  });
});
