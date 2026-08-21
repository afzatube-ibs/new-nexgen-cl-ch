/**
 * Entrypoint. Loads and validates configuration, builds the Fastify
 * instance (server.ts), and starts listening — nothing else. Kept
 * deliberately thin so `server.ts` remains fully testable without ever
 * having to actually bind a port (see test/integration/*.test.ts, which
 * import `buildServer`/`buildTestServer` directly).
 */
import { loadEnv } from './config/env.js';
import { buildServer } from './server.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await buildServer({ env });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (error) {
    app.log.error({ err: error }, 'Store API Gateway failed to start');
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Store API Gateway shutting down');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  // Last-resort: the logger itself may not exist yet if loadEnv() threw.
  console.error('Fatal error starting Store API Gateway:', error);
  process.exit(1);
});
