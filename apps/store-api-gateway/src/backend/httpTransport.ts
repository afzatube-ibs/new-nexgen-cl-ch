/**
 * Backend HTTP transport compatibility for CloudLinux accounts with a hard
 * virtual-address-space limit. Node's built-in fetch lazily instantiates
 * Undici's llhttp WebAssembly parser; that allocation can fail even when the
 * host has ample physical RAM. Native node:http/node:https avoids the Wasm
 * allocation while preserving the normal fetch path everywhere else.
 */
export interface BackendHttpResponse {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export async function backendRequest(
  urlString: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<BackendHttpResponse> {
  if (process.env.GATEWAY_NATIVE_HTTP !== '1') {
    return fetch(urlString, init);
  }

  const url = new URL(urlString);
  const transport = url.protocol === 'https:' ? await import('node:https') : await import('node:http');
  const headers = init.headers as Record<string, string> | undefined;
  const body = typeof init.body === 'string' ? init.body : undefined;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      url,
      {
        method: init.method ?? 'GET',
        headers: {
          ...headers,
          ...(body === undefined ? {} : { 'Content-Length': Buffer.byteLength(body).toString() }),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf8');
          const status = response.statusCode ?? 500;

          resolve({
            ok: status >= 200 && status < 300,
            status,
            async text(): Promise<string> {
              return responseBody;
            },
            async json(): Promise<unknown> {
              return JSON.parse(responseBody);
            },
          });
        });
      },
    );

    request.setTimeout(timeoutMs, () => {
      const timeoutError = new Error(`Backend request timed out after ${timeoutMs}ms`);
      timeoutError.name = 'AbortError';
      request.destroy(timeoutError);
    });
    request.on('error', reject);

    if (body !== undefined) request.write(body);
    request.end();
  });
}
