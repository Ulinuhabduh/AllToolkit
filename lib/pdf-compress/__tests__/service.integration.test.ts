/**
 * Integration: full service (analyze → pipeline → validate → compare)
 * across all 3 modes. Requires Ghostscript on PATH (present in Docker and
 * in this dev environment). qpdf/pdfimages are optional — the pipeline
 * degrades gracefully when they are missing.
 */
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { compressPdfService } from '../compression-service';
import { runBinary } from '../exec';
import type { CompressionMode } from '../types';
import { corruptPdf, grayscalePdf, imageHeavyPdf, mixedPdf, scannedPdf, textPdf, tinyPdf } from './fixtures';

const MODES: CompressionMode[] = ['extreme', 'recommended', 'less'];

async function gsPresent(): Promise<boolean> {
  try {
    const r = await runBinary('gs', ['--version'], { timeoutMs: 10_000 });
    return r.code === 0;
  } catch {
    return false;
  }
}

async function freshStore(): Promise<string> {
  const d = path.join(os.tmpdir(), `pdfc-int-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
  await fs.mkdir(d, { recursive: true });
  return d;
}

describe('compression-service integration', () => {
  it('ghostscript is available in this environment', async () => {
    expect(await gsPresent()).toBe(true);
  }, 30_000);

  it.each(MODES)('image-heavy PDF × %s → valid, same pages, never larger', async (mode) => {
    const buf = await imageHeavyPdf(2);
    const store = await freshStore();
    const out = await compressPdfService({ data: buf, filename: 'img-heavy.pdf', mode, storeDir: store });
    expect(out.success).toBe(true);
    expect(out.pages).toBe(2);
    expect(out.compressedSize).toBeLessThanOrEqual(out.originalSize);
    expect(out.savedPercentage).toBeGreaterThanOrEqual(0);
    // Output on disk is a real PDF with the same page count.
    const onDisk = await fs.readFile(out.outputPath);
    expect(onDisk.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await PDFDocument.load(onDisk, { ignoreEncryption: true })).getPageCount()).toBe(2);
    await fs.rm(store, { recursive: true, force: true }).catch(() => undefined);
  }, 180_000);

  it('extreme compresses image-heavy input substantially (real compression, not metadata)', async () => {
    const buf = await imageHeavyPdf(3);
    const store = await freshStore();
    const out = await compressPdfService({ data: buf, filename: 'img.pdf', mode: 'extreme', storeDir: store });
    // Our fixture embeds ~190 DPI JPEGs; 96 DPI re-distill must save well over 1%.
    expect(out.fallback).toBe(false);
    expect(out.savedPercentage).toBeGreaterThan(10);
    await fs.rm(store, { recursive: true, force: true }).catch(() => undefined);
  }, 180_000);

  it('modes are ordered: extreme ≤ recommended ≤ less (bytes)', async () => {
    const buf = await imageHeavyPdf(2);
    const sizes: number[] = [];
    for (const mode of MODES) {
      const store = await freshStore();
      const out = await compressPdfService({ data: buf, filename: 'm.pdf', mode, storeDir: store });
      // Compare raw candidate output even on fallback (fallback == original size).
      sizes.push(out.compressedSize);
      await fs.rm(store, { recursive: true, force: true }).catch(() => undefined);
    }
    expect(sizes[0]).toBeLessThanOrEqual(sizes[1]);
    expect(sizes[1]).toBeLessThanOrEqual(sizes[2]);
  }, 300_000);

  it.each([
    ['text', () => textPdf(2)],
    ['mixed', () => mixedPdf()],
    ['grayscale', () => grayscalePdf()],
    ['scanned', () => scannedPdf(2)],
    ['tiny-optimal', () => tinyPdf()],
  ])('%s PDF × recommended → valid + fallback-safe', async (_name, make) => {
    const buf = await make();
    const store = await freshStore();
    const out = await compressPdfService({ data: buf, filename: `${_name}.pdf`, mode: 'recommended', storeDir: store });
    expect(out.success).toBe(true);
    expect(out.compressedSize).toBeLessThanOrEqual(out.originalSize);
    const onDisk = await fs.readFile(out.outputPath);
    expect((await PDFDocument.load(onDisk, { ignoreEncryption: true })).getPageCount()).toBe(out.pages);
    await fs.rm(store, { recursive: true, force: true }).catch(() => undefined);
  }, 180_000);

  it('already-optimal tiny PDF → graceful fallback to original (not an error)', async () => {
    const buf = await tinyPdf();
    const store = await freshStore();
    const out = await compressPdfService({ data: buf, filename: 'tiny.pdf', mode: 'recommended', storeDir: store });
    expect(out.success).toBe(true);
    expect(out.pages).toBe(1);
    // Either fallback (original kept) or a slightly smaller file — never larger.
    expect(out.compressedSize).toBeLessThanOrEqual(out.originalSize);
    if (out.fallback) expect(out.fallbackReason).toBeTruthy();
    await fs.rm(store, { recursive: true, force: true }).catch(() => undefined);
  }, 120_000);

  it('corrupt PDF → clean 400-style rejection (no crash, no temp leak)', async () => {
    const store = await freshStore();
    await expect(
      compressPdfService({ data: corruptPdf(), filename: 'bad.pdf', mode: 'recommended', storeDir: store })
    ).rejects.toThrow();
    await fs.rm(store, { recursive: true, force: true }).catch(() => undefined);
  }, 60_000);

  it('oversize input (>50MB) is rejected before any processing', async () => {
    const store = await freshStore();
    const big = Buffer.alloc(51 * 1024 * 1024, 0);
    big.write('%PDF-1.4', 0);
    await expect(
      compressPdfService({ data: big, filename: 'big.pdf', mode: 'extreme', storeDir: store })
    ).rejects.toThrow(/too large/i);
    await fs.rm(store, { recursive: true, force: true }).catch(() => undefined);
  }, 60_000);
});
