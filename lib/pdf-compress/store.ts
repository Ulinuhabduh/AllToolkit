/**
 * Download store — maps short-lived IDs to compressed files on disk.
 * Files live under os.tmpdir()/pdfc-store, swept lazily on access (TTL).
 */
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const STORE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function storeDir(): string {
  return path.join(os.tmpdir(), 'pdfc-store');
}

export async function sweepStore(): Promise<void> {
  try {
    const dir = storeDir();
    const entries = await fs.readdir(dir);
    const now = Date.now();
    await Promise.all(
      entries.map(async (e) => {
        const p = path.join(dir, e);
        try {
          const st = await fs.stat(p);
          if (now - st.mtimeMs > STORE_TTL_MS) await fs.unlink(p).catch(() => undefined);
        } catch {
          /* ignore */
        }
      })
    );
  } catch {
    /* store dir may not exist yet */
  }
}

/** Store an already-written PDF path under a public ID. Returns the ID. */
export async function registerStoredFile(absPath: string): Promise<string> {
  await sweepStore().catch(() => undefined);
  return path.basename(absPath, '.pdf');
}
