/**
 * POST /api/pdf/compress
 * Multipart upload: `file` (PDF, ≤50 MB) + `mode` (extreme|recommended|less).
 *
 * Response (JSON):
 * {
 *   "success": true, "mode": "recommended",
 *   "originalSize": 24800000, "compressedSize": 6200000,
 *   "savedBytes": 18600000, "savedPercentage": 75.0,
 *   "pages": 18, "processingTimeMs": 4200,
 *   "fallback": false, "downloadUrl": "/api/pdf/compress/download?id=..."
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  compressPdfService,
  InputRejectedError,
  parseMode,
  sanitizeFilename,
  storeDir,
} from '@/lib/pdf-compress';
import { registerStoredFile } from '@/lib/pdf-compress/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Docker/long-running server (seconds)

// ── lightweight in-memory rate limit (per IP, sliding window) ──────────
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQ = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) {
    // prevent unbounded growth: drop oldest keys
    for (const k of hits.keys()) {
      hits.delete(k);
      if (hits.size < 4000) break;
    }
  }
  return arr.length > MAX_REQ;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ success: false, error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid multipart upload.' }, { status: 400 });
  }

  const mode = parseMode(form.get('mode'));
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: 'Missing "file" field. Send multipart: file=<pdf>, mode=extreme|recommended|less.' },
      { status: 400 }
    );
  }
  // MIME check (allow generic octet-stream when extension is .pdf — some clients lie).
  const looksPdf =
    file.type === 'application/pdf' ||
    file.type === 'application/octet-stream' ||
    file.type === '' ||
    /\.pdf$/i.test(file.name);
  if (!looksPdf) {
    return NextResponse.json({ success: false, error: 'Only PDF files are accepted.' }, { status: 400 });
  }

  let data: Buffer;
  try {
    data = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ success: false, error: 'Could not read upload.' }, { status: 400 });
  }

  try {
    const out = await compressPdfService({
      data,
      filename: sanitizeFilename(file.name || 'document.pdf'),
      mode,
      storeDir: storeDir(),
    });
    const id = await registerStoredFile(out.outputPath);
    return NextResponse.json({
      success: true,
      mode: out.mode,
      originalSize: out.originalSize,
      compressedSize: out.compressedSize,
      savedBytes: out.savedBytes,
      savedPercentage: out.savedPercentage,
      pages: out.pages,
      processingTimeMs: out.processingTimeMs,
      fallback: out.fallback,
      fallbackReason: out.fallbackReason ?? null,
      downloadUrl: `/api/pdf/compress/download?id=${encodeURIComponent(id)}&filename=${encodeURIComponent(out.downloadFilename)}`,
    });
  } catch (e) {
    if (e instanceof InputRejectedError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }
    console.error('[pdf/compress] service error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: `Compression failed: ${msg}`.slice(0, 500) },
      { status: 500 }
    );
  }
}
