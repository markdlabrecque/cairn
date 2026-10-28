import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, realpath, stat } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { SqliteStorage } from '@earendil-works/pi-durable/storage/sqlite';
import { openNodeSqliteDatabase } from '@earendil-works/pi-durable/storage/sqlite/node';
import type { Config } from '../config.ts';

export async function canonical(path: string): Promise<string> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    const info = await stat(path);
    if (info.nlink !== 1) throw new Error('Hard-linked stores are not supported');
    return await realpath(path);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    return join(await realpath(dirname(path)), basename(path));
  }
}

async function lock(path: string) {
  const keeper = spawn('/usr/bin/flock', ['--exclusive', '--nonblock', '--conflict-exit-code', '73', path,
    process.execPath, '-e', 'process.stdout.write("locked\\n"); process.stdin.resume();'], { stdio: ['pipe', 'pipe', 'pipe'] });
  const exited = once(keeper, 'exit');
  await Promise.race([
    once(keeper.stdout, 'data'),
    exited.then(() => { throw new Error('Agent/store already owned or OS lock unavailable'); }),
  ]);
  keeper.stdin.on('error', () => {});
  return async () => { keeper.stdin.end(); await exited; };
}

export async function ownStore(config: Config) {
  const store = await canonical(config.store);
  const ledger = await canonical(config.ledger);
  if (store === ledger) throw new Error('Spending ledger must be separate');
  const locks = join(tmpdir(), `personal-agent-locks-${process.getuid!()}`);
  await mkdir(locks, { mode: 0o700, recursive: true });
  const info = await stat(locks);
  if (info.uid !== process.getuid!() || (info.mode & 0o077) !== 0) throw new Error('Unsafe ownership directory');
  const unlockAgent = await lock(join(locks, createHash('sha256').update(config.agentId).digest('hex')));
  let unlockStore: (() => Promise<void>) | undefined;
  try {
    unlockStore = await lock(`${store}.lock`);
    const db = await openNodeSqliteDatabase(store);
    try {
      await db.exec('PRAGMA synchronous = FULL');
      if ((await db.get<{ synchronous: number }>('PRAGMA synchronous'))?.synchronous !== 2) throw new Error('SQLite FULL required');
      const storage = await SqliteStorage.open(db);
      return { storage, ledger, unlock: async () => { await unlockStore!(); await unlockAgent(); } };
    } catch (error) { await db.close(); throw error; }
  } catch (error) { await unlockStore?.(); await unlockAgent(); throw error; }
}
