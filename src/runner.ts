import { createServer } from 'node:http';
import { chmod, rm, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { once } from 'node:events';
import { loadConfig, protectedFile } from './config.ts';
import { ownStore } from './host/store.ts';
import { spendingLedger } from './inference/budget.ts';
import { openRuntime, Rejection } from './runtime/pi-durable.ts';
import { authenticated, body, send, failure } from './http.ts';

process.umask(0o077);
try {
  const config = await loadConfig(process.argv[2]!);
  const token = await protectedFile(config.authFile);
  const store = await ownStore(config);
  const ledger = spendingLedger(store.ledger, config);
  let runtime: Awaited<ReturnType<typeof openRuntime>>;
  try { runtime = await openRuntime(store.storage, config, ledger); }
  catch (error) { ledger.close(); await store.unlock(); throw error; }
  const server = createServer((req, res) => {
    void (async () => {
      if (!authenticated(req, token)) throw new Rejection(401, 'Authentication required');
      if (req.headers['x-sender'] !== config.owner || req.headers['x-source'] !== 'cli') throw new Rejection(403, 'Route denied');
      const match = /^\/v1\/agents\/([^/]+)\/requests(?:\/([^/]+)(\/result)?)?$/.exec(req.url ?? '');
      if (!match || match[1] !== config.agentId) throw new Rejection(403, 'Route denied');
      if (req.method === 'POST' && !match[2]) {
        const result = await runtime.submit(await body(req, config.limits.bodyBytes));
        send(res, result.status, result);
      } else if (req.method === 'GET' && match[2]) {
        const result = await runtime.inspect(decodeURIComponent(match[2]), !!match[3]);
        send(res, result.status, result);
      } else throw new Rejection(400, 'Unsupported method');
    })().catch(error => failure(res, error));
  });
  await mkdir(dirname(config.socket), { recursive: true, mode: 0o700 });
  await rm(config.socket, { force: true });
  server.listen(config.socket);
  await once(server, 'listening');
  await chmod(config.socket, 0o600);
  console.log('runner ready');
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    server.close();
    server.closeAllConnections();
    await runtime.close();
    ledger.close();
    await rm(config.socket, { force: true });
    await store.unlock();
  };
  process.once('SIGTERM', () => { void close(); });
  process.once('SIGINT', () => { void close(); });
} catch {
  console.error('runner startup failed');
  process.exitCode = 2;
}
