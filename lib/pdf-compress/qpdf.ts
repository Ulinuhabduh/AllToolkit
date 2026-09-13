/**
 * qpdf wrapper — structural optimization (object streams, stream
 * compression, unused-object removal, clean rewrite).
 *
 * Graceful degradation: if the `qpdf` binary is absent (e.g. minimal local
 * dev), every function reports `available:false` and the pipeline simply
 * skips that pass instead of failing.
 */
import { promises as fs } from 'node:fs';
import { binaryExists, runBinary } from './exec';

export const QPDF_TIMEOUT_MS = 60_000;

let cached: boolean | null = null;

export async function qpdfAvailable(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    const r = await runBinary('qpdf', ['--version'], { timeoutMs: 10_000 });
    cached = r.code === 0;
  } catch {
    cached = false;
  }
  // Touch binaryExists helper so bundlers keep it (and for future probes).
  void binaryExists;
  return cached;
}

/** Pass 1 / Pass 4: rewrite cleanly with object streams + compressed streams. */
export async function qpdfOptimize(inputPath: string, outputPath: string): Promise<void> {
  const res = await runBinary(
    'qpdf',
    [
      '--object-streams=generate',
      '--compress-streams',
      '--recompress-flate',
      '--remove-unreferenced-resources=yes',
      inputPath,
      outputPath,
    ],
    { timeoutMs: QPDF_TIMEOUT_MS }
  );
  if (res.code !== 0) {
    throw new Error(`qpdf optimize failed (exit ${res.code}): ${res.stderr.trim().slice(0, 1500)}`);
  }
}

/** Equivalent of `qpdf --check`: returns null when healthy, else a reason. */
export async function qpdfCheck(filePath: string): Promise<string | null> {
  try {
    const res = await runBinary('qpdf', ['--check', filePath], { timeoutMs: 30_000 });
    if (res.code !== 0) {
      const out = `${res.stdout}\n${res.stderr}`.trim().slice(0, 1000);
      return out || `qpdf --check exit ${res.code}`;
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function fileSize(path: string): Promise<number> {
  return (await fs.stat(path)).size;
}
