/**
 * pdf-validator — never hand a corrupt file to the user.
 *
 * Checks (in order, cheap → expensive):
 *  1. exists, size > 0
 *  2. starts with %PDF-
 *  3. loads in pdf-lib and reports the EXPECTED page count
 *  4. qpdf --check when the binary exists
 *
 * Any failure → invalid (caller falls back to the original).
 */
import { promises as fs } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { qpdfAvailable, qpdfCheck } from './qpdf';

export interface ValidationResult {
  valid: boolean;
  pages: number;
  reason?: string;
}

export async function validateCompressedPdf(
  originalPath: string,
  compressedPath: string,
  expectedPages?: number
): Promise<ValidationResult> {
  let stat: { size: number };
  try {
    stat = await fs.stat(compressedPath);
  } catch {
    return { valid: false, pages: 0, reason: 'output file missing' };
  }
  if (stat.size <= 0) return { valid: false, pages: 0, reason: 'output is empty' };

  const head = Buffer.alloc(5);
  const fh = await fs.open(compressedPath, 'r');
  try {
    await fh.read(head, 0, 5, 0);
  } finally {
    await fh.close();
  }
  if (head.toString('latin1') !== '%PDF-') {
    return { valid: false, pages: 0, reason: 'not a PDF (bad signature)' };
  }

  let expected = expectedPages;
  if (expected === undefined) {
    try {
      const orig = await fs.readFile(originalPath);
      expected = (await PDFDocument.load(orig, { ignoreEncryption: true })).getPageCount();
    } catch {
      expected = undefined;
    }
  }

  let pages = 0;
  try {
    const bytes = await fs.readFile(compressedPath);
    pages = (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount();
  } catch (e) {
    return {
      valid: false,
      pages: 0,
      reason: `unreadable PDF: ${e instanceof Error ? e.message : String(e)}`.slice(0, 300),
    };
  }

  if (expected !== undefined && pages !== expected) {
    return { valid: false, pages, reason: `page count changed ${expected} → ${pages}` };
  }

  if (await qpdfAvailable()) {
    const problem = await qpdfCheck(compressedPath);
    if (problem) return { valid: false, pages, reason: `qpdf --check: ${problem}`.slice(0, 300) };
  }

  return { valid: true, pages };
}
