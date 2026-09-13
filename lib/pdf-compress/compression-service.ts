/**
 * compression-service — orchestrator.
 *
 *   input bytes → validate input → analyze → multi-pass pipeline →
 *   validate each candidate → pick smallest valid → enforce
 *   "never larger + min 1% saving" rule → metrics.
 *
 * All work happens in an isolated temp dir that is ALWAYS cleaned up,
 * except the single chosen output which is moved to the store dir for
 * the download endpoint (TTL + lazy expiry).
 */
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import type { CompressionMode, CompressionResult, PdfAnalysis } from './types';
import { getProfile } from './compression-profiles';
import { analyzePdf } from './pdf-analyzer';
import { runPipeline } from './pdf-optimizer';
import { validateCompressedPdf } from './pdf-validator';

export const MAX_INPUT_BYTES = 50 * 1024 * 1024; // 50 MB
export const MIN_SAVING_RATIO_DEFAULT = 0.01; // 1%

export interface ServiceInput {
  data: Buffer;
  filename: string;
  mode: CompressionMode;
  /** Where the chosen output is kept for download. */
  storeDir: string;
}

export interface ServiceOutput extends CompressionResult {
  /** Absolute path of the file to serve (original copy or compressed). */
  outputPath: string;
  /** Suggested download filename. */
  downloadFilename: string;
  analysis: PdfAnalysis;
  passes: { label: string; size: number | null; note: string }[];
}

export class InputRejectedError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'InputRejectedError';
  }
}

export function buildMetrics(
  originalSize: number,
  compressedSize: number,
  mode: CompressionMode,
  processingTimeMs: number,
  pages: number
): Omit<CompressionResult, 'success' | 'fallback' | 'fallbackReason'> {
  const savedBytes = Math.max(0, originalSize - compressedSize);
  const savedPercentage =
    originalSize > 0 ? Math.round(((savedBytes / originalSize) * 100) * 10) / 10 : 0;
  return { originalSize, compressedSize, savedBytes, savedPercentage, mode, processingTimeMs, pages };
}

export function sanitizeFilename(name: string): string {
  const base = path.basename(name || 'document.pdf').replace(/\.pdf$/i, '');
  const clean = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'document';
  return `${clean}.pdf`;
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfc-'));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function compressPdfService(input: ServiceInput): Promise<ServiceOutput> {
  const started = Date.now();
  const { data, filename, mode } = input;
  const profile = getProfile(mode);

  // ── input validation ──────────────────────────────────────────────
  if (!data || data.length === 0) throw new InputRejectedError('Empty file.');
  if (data.length > MAX_INPUT_BYTES) {
    throw new InputRejectedError(
      `File too large (${(data.length / 1048576).toFixed(1)} MB). Limit is 50 MB.`
    );
  }
  if (data.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new InputRejectedError('Not a PDF file (bad signature).');
  }
  let inputPages = 0;
  try {
    inputPages = (await PDFDocument.load(data, { ignoreEncryption: true })).getPageCount();
  } catch {
    throw new InputRejectedError('Corrupt or unreadable PDF.');
  }
  if (inputPages < 1) throw new InputRejectedError('PDF has no pages.');

  const downloadFilename = `compressed-${mode}-${sanitizeFilename(filename)}`;

  const output = await withTempDir(async (workDir) => {
    const inputPath = path.join(workDir, `input-${randomUUID()}.pdf`);
    await fs.writeFile(inputPath, data);

    // ── analyze ───────────────────────────────────────────────────
    const analysis = await analyzePdf(inputPath);

    if (analysis.encrypted) {
      throw new InputRejectedError(
        'PDF is password-protected. Unlock it first (PDF → Unlock), then compress.'
      );
    }
    if (analysis.pages !== inputPages) {
      // Non-fatal inconsistency; trust pdf-lib count from validation later.
    }

    // ── multi-pass pipeline ───────────────────────────────────────
    const passes = await runPipeline(inputPath, profile, analysis, { workDir, tag: mode });

    // ── validate candidates, keep smallest valid ──────────────────
    let best: { path: string; size: number } | null = null;
    for (const p of passes) {
      if (!p.path || p.size === null) continue;
      const v = await validateCompressedPdf(inputPath, p.path, inputPages);
      if (!v.valid) {
        p.note += ` | rejected: ${v.reason}`;
        continue;
      }
      if (!best || p.size < best.size) best = { path: p.path, size: p.size };
    }

    const elapsed = Date.now() - started;
    const minRatio = profile.minSavingRatio ?? MIN_SAVING_RATIO_DEFAULT;

    // ── never-larger + min-saving rule ────────────────────────────
    const finalize = async (
      chosenPath: string | null,
      chosenSize: number,
      fallback: boolean,
      fallbackReason?: string
    ): Promise<ServiceOutput> => {
      await fs.mkdir(input.storeDir, { recursive: true });
      const id = randomUUID();
      const stored = path.join(input.storeDir, `${id}.pdf`);
      if (chosenPath) {
        await fs.copyFile(chosenPath, stored);
      } else {
        await fs.writeFile(stored, data);
      }
      const metrics = buildMetrics(data.length, fallback ? data.length : chosenSize, mode, elapsed, inputPages);
      return {
        ...metrics,
        success: true,
        fallback,
        fallbackReason,
        outputPath: stored,
        downloadFilename,
        analysis,
        passes: passes.map((p) => ({ label: p.label, size: p.size, note: p.note })),
      };
    };

    if (!best) {
      return finalize(null, data.length, true, 'no valid compressed candidate — original kept');
    }
    const savingRatio = (data.length - best.size) / data.length;
    if (savingRatio < minRatio) {
      return finalize(
        null,
        data.length,
        true,
        `only ${(savingRatio * 100).toFixed(1)}% smaller (< ${(minRatio * 100).toFixed(0)}% threshold) — original kept`
      );
    }
    return finalize(best.path, best.size, false);
  });

  return output;
}
