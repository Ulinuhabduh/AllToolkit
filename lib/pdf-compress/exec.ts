/**
 * Safe process execution — NEVER build shell command strings from user input.
 * All binaries are spawned with an argument ARRAY (no shell), with timeout,
 * stderr capture, exit-code checks and temp-file discipline handled by callers.
 */
import { spawn } from 'node:child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export class ProcessTimeoutError extends Error {
  constructor(
    public readonly binary: string,
    public readonly timeoutMs: number
  ) {
    super(`${binary} timed out after ${timeoutMs}ms`);
    this.name = 'ProcessTimeoutError';
  }
}

export async function runBinary(
  binary: string,
  args: string[],
  opts: { timeoutMs?: number; maxBufferBytes?: number } = {}
): Promise<ExecResult> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const maxBufferBytes = opts.maxBufferBytes ?? 4 * 1024 * 1024;

  return new Promise<ExecResult>((resolve, reject) => {
    const child = spawn(binary, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      // Never spawn a shell — args are passed verbatim, immune to injection.
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const killTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {
        /* already exited */
      }
      reject(new ProcessTimeoutError(binary, timeoutMs));
    }, timeoutMs);
    // Don't keep the event loop alive just for the killer.
    (killTimer as unknown as { unref?: () => void }).unref?.();

    const append = (store: 'out' | 'err', chunk: Buffer) => {
      const text = chunk.toString('utf8');
      if (store === 'out') {
        if (stdout.length < maxBufferBytes) stdout += text.slice(0, maxBufferBytes - stdout.length);
      } else {
        if (stderr.length < maxBufferBytes) stderr += text.slice(0, maxBufferBytes - stderr.length);
      }
    };

    child.stdout?.on('data', (c: Buffer) => append('out', c));
    child.stderr?.on('data', (c: Buffer) => append('err', c));
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      reject(err);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      resolve({ stdout, stderr, code });
    });
  });
}

/** Check whether a system binary exists on PATH (used for graceful degradation). */
export async function binaryExists(binary: string): Promise<boolean> {
  try {
    const r = await runBinary(binary, binary === 'gs' ? ['--version'] : ['--version'], {
      timeoutMs: 10_000,
    });
    return r.code === 0;
  } catch {
    return false;
  }
}
