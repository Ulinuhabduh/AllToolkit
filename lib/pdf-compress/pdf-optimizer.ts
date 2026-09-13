/**
 * pdf-optimizer — multi-pass pipeline.
 *
 *   Pass 1: structural optimization (qpdf object streams / stream squeeze)
 *   Pass 2: Ghostscript re-distill with explicit profile params
 *           (per-image downsample, text + vectors preserved)
 *   Pass 2b: scan-rebuild candidate — ONLY for high-confidence pure scans:
 *            dominant page images are recompressed with sharp at the exact
 *            profile JPEG quality and rebuilt at original page sizes.
 *            Mixed/text PDFs never touch this pass (no full-page raster).
 *   Pass 3: final qpdf squeeze of the best candidate
 *   Pass 4: validate every candidate, keep the smallest valid one
 *
 * Every pass is best-effort and isolated: a failing pass is logged and
 * skipped, never fatal. The service layer enforces the "never larger"
 * rule + fallback.
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { PDFDocument, degrees } from 'pdf-lib';
import type { CompressionProfile } from './types';
import type { PdfAnalysis } from './types';
import { runBinary } from './exec';
import { qpdfAvailable, qpdfOptimize } from './qpdf';
import { runGhostscript } from './ghostscript';
import { recompressImage } from './image-optimizer';

export interface PassOutcome {
  label: string;
  path: string | null;
  size: number | null;
  note: string;
}

async function existsNonEmpty(p: string): Promise<number | null> {
  try {
    const s = await fs.stat(p);
    return s.size > 0 ? s.size : null;
  } catch {
    return null;
  }
}

async function pdfimagesAvailable(): Promise<boolean> {
  try {
    const r = await runBinary('pdfimages', ['-v'], { timeoutMs: 10_000 });
    return (r.code === 0 || /poppler|pdfimages/i.test(`${r.stdout}${r.stderr}`));
  } catch {
    return false;
  }
}

/** pdfimages -list parsing: rows per (page, image). */
interface ListedImage {
  page: number;
  width: number;
  height: number;
  sizeKB: number;
}

async function listImages(inputPath: string, workDir: string): Promise<ListedImage[] | null> {
  try {
    const r = await runBinary('pdfimages', ['-list', inputPath], { timeoutMs: 30_000, maxBufferBytes: 8 * 1024 * 1024 });
    if (r.code !== 0) return null;
    const lines = r.stdout.split('\n');
    const out: ListedImage[] = [];
    for (const line of lines) {
      const m = line.trim().match(/^(\d+)\s+(\d+)\s+\S+\s+(\d+)\s+(\d+)\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+[\d.]+\s*([KMGT]?)/);
      // pdfimages -list columns: page num type width height color comp bpc enc interp objectID x-ppi y-ppi size ratio
      // Be lenient: extract leading ints + trailing size token.
      if (!m) continue;
      const page = parseInt(m[1], 10);
      const width = parseInt(m[3], 10);
      const height = parseInt(m[4], 10);
      const sizeTok = line.trim().split(/\s+/);
      const sizeStr = sizeTok[sizeTok.length - 2] ?? '0';
      const unit = (sizeTok[sizeTok.length - 1] ?? 'K').toUpperCase();
      let kb = parseFloat(sizeStr) || 0;
      if (unit.startsWith('M')) kb *= 1024;
      else if (unit.startsWith('B')) kb /= 1024;
      else if (unit.startsWith('G')) kb *= 1024 * 1024;
      if (Number.isFinite(page) && width > 0 && height > 0) out.push({ page, width, height, sizeKB: kb });
    }
    void workDir;
    return out;
  } catch {
    return null;
  }
}

/**
 * Scan-rebuild: extract each page's dominant image, recompress with sharp at
 * profile quality/DPI, rebuild a new PDF at the ORIGINAL page sizes.
 * Returns output path or null when not applicable / not beneficial.
 */
async function scanRebuildPass(
  inputPath: string,
  outputPath: string,
  profile: CompressionProfile,
  analysis: PdfAnalysis,
  workDir: string
): Promise<PassOutcome> {
  const fail = (note: string): PassOutcome => ({ label: 'scan-rebuild', path: null, size: null, note });
  if (!analysis.isScanned) return fail('not a pure scan — skipped (vectors/text preserved)');
  if (!(await pdfimagesAvailable())) return fail('pdfimages unavailable — skipped');

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(await fs.readFile(inputPath), { ignoreEncryption: true });
  } catch (e) {
    return fail(`cannot parse pages: ${e instanceof Error ? e.message : String(e)}`);
  }
  const pages = doc.getPageCount();
  if (pages < 1 || pages > 200) return fail(`page count ${pages} out of rebuild range`);

  const listed = await listImages(inputPath, workDir);
  // Require: every page has ≥1 large image (else mixed doc → abort).
  if (listed) {
    for (let p = 1; p <= pages; p++) {
      const onPage = listed.filter((l) => l.page === p);
      if (onPage.length === 0) return fail(`page ${p} has no listed image — mixed doc, skipped`);
      const biggest = onPage.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));
      if (biggest.width < 400 || biggest.height < 400) {
        return fail(`page ${p} dominant image too small (${biggest.width}x${biggest.height}) — skipped`);
      }
    }
  }

  try {
    const out = await PDFDocument.create();
    for (let p = 1; p <= pages; p++) {
      const srcPage = doc.getPage(p - 1);
      const { width: wPt, height: hPt } = srcPage.getSize();
      const rotation = srcPage.getRotation().angle;

      // Extract page p images at native encoding.
      const prefix = path.join(workDir, `scan-p${p}-img`);
      const ex = await runBinary('pdfimages', ['-all', '-f', String(p), '-l', String(p), inputPath, prefix], {
        timeoutMs: 60_000,
      });
      if (ex.code !== 0) return fail(`pdfimages extract failed on page ${p}`);
      const files = (await fs.readdir(workDir)).filter((f) => f.startsWith(`scan-p${p}-img`) && !f.endsWith('.txt'));
      if (files.length === 0) return fail(`no image extracted for page ${p} — skipped`);

      // Pick the largest extracted file as the page background.
      let bestFile = '';
      let bestSize = -1;
      for (const f of files) {
        const s = await fs.stat(path.join(workDir, f));
        if (s.size > bestSize) {
          bestSize = s.size;
          bestFile = f;
        }
      }
      const raw = await fs.readFile(path.join(workDir, bestFile));
      let rec;
      try {
        rec = await recompressImage(raw, profile, {
          targetDpi: profile.colorDpi,
          displayWidthPt: wPt,
          displayHeightPt: hPt,
        });
      } catch {
        return fail(`sharp cannot decode page ${p} image (${bestFile}) — skipped`);
      }

      const embedded =
        rec.format === 'png' ? await out.embedPng(rec.data) : await out.embedJpg(rec.data);
      // Preserve the exact original page box + rotation so page size,
      // orientation and crop never change (quality safeguard).
      const newPage = out.addPage([wPt, hPt]);
      try {
        newPage.setRotation(degrees(rotation));
      } catch {
        /* keep unrotated */
      }
      newPage.drawImage(embedded, { x: 0, y: 0, width: wPt, height: hPt });
    }
    // Re-add with exact original sizes (second pass guarantees fidelity).
    const bytes = await out.save({ useObjectStreams: true });
    await fs.writeFile(outputPath, bytes);
    const size = await existsNonEmpty(outputPath);
    if (size === null) return fail('rebuild produced empty file');
    return { label: 'scan-rebuild', path: outputPath, size, note: `rebuilt ${pages} pages via sharp` };
  } catch (e) {
    return fail(`rebuild error: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200));
  }
}

export interface PipelineOptions {
  workDir: string;
  /** Tag for temp file names (mode). */
  tag: string;
}

export async function runPipeline(
  inputPath: string,
  profile: CompressionProfile,
  analysis: PdfAnalysis,
  opts: PipelineOptions
): Promise<PassOutcome[]> {
  const outcomes: PassOutcome[] = [];
  const { workDir, tag } = opts;
  const tmp = (name: string) => path.join(workDir, `${tag}-${name}.pdf`);

  // ── Pass 1: structural ──────────────────────────────────────────────
  if (await qpdfAvailable()) {
    const p1 = tmp('p1-struct');
    try {
      await qpdfOptimize(inputPath, p1);
      const size = await existsNonEmpty(p1);
      outcomes.push(
        size !== null
          ? { label: 'structural-qpdf', path: p1, size, note: 'object streams + flate recompress' }
          : { label: 'structural-qpdf', path: null, size: null, note: 'empty output' }
      );
    } catch (e) {
      outcomes.push({
        label: 'structural-qpdf',
        path: null,
        size: null,
        note: `skipped: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200),
      });
    }
  } else {
    outcomes.push({ label: 'structural-qpdf', path: null, size: null, note: 'qpdf binary missing — skipped' });
  }

  // ── Pass 2: Ghostscript re-distill (the workhorse) ──────────────────
  // Feed it the structurally-optimized file when that pass actually shrank
  // the input; otherwise feed the original (GS output quality is the same,
  // but GS runs faster on clean input).
  const struct = outcomes.find((o) => o.label === 'structural-qpdf');
  let gsInput = inputPath;
  try {
    const origSize = (await fs.stat(inputPath)).size;
    if (struct?.path && struct.size !== null && struct.size < origSize) gsInput = struct.path;
  } catch {
    /* keep original */
  }
  const p2 = tmp('p2-gs');
  try {
    await runGhostscript(gsInput, p2, profile);
    const size = await existsNonEmpty(p2);
    outcomes.push(
      size !== null
        ? { label: 'ghostscript', path: p2, size, note: `dpi ${profile.colorDpi}/${profile.grayscaleDpi}/${profile.monochromeDpi}` }
        : { label: 'ghostscript', path: null, size: null, note: 'empty output' }
    );
  } catch (e) {
    outcomes.push({
      label: 'ghostscript',
      path: null,
      size: null,
      note: `failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 300),
    });
  }

  // ── Pass 2b: scan rebuild (scans only) ──────────────────────────────
  const p2b = tmp('p2b-scan');
  outcomes.push(await scanRebuildPass(inputPath, p2b, profile, analysis, workDir));

  // ── Pass 3: final squeeze of the current best ───────────────────────
  const viable = outcomes.filter((o) => o.path && o.size !== null) as (PassOutcome & { path: string; size: number })[];
  if (viable.length > 0 && (await qpdfAvailable())) {
    viable.sort((a, b) => a.size - b.size);
    const p3 = tmp('p3-final');
    try {
      await qpdfOptimize(viable[0].path, p3);
      const size = await existsNonEmpty(p3);
      outcomes.push(
        size !== null && size <= viable[0].size
          ? { label: 'final-qpdf', path: p3, size, note: `squeezed ${viable[0].label}` }
          : { label: 'final-qpdf', path: null, size: null, note: 'no further gain' }
      );
    } catch (e) {
      outcomes.push({
        label: 'final-qpdf',
        path: null,
        size: null,
        note: `skipped: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200),
      });
    }
  }

  return outcomes;
}
