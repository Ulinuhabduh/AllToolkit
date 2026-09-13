/**
 * GET /api/pdf/compress/download?id=<uuid>&filename=<name.pdf>
 * Streams the compressed (or fallback-original) PDF produced by POST.
 * Files expire after STORE_TTL_MS (lazy sweep).
 */
import { NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { sanitizeFilename, storeDir, STORE_TTL_MS, sweepStore } from '@/lib/pdf-compress';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validId(id: string): boolean {
  return /^[a-f0-9-]{8,64}$/i.test(id) && !id.includes('/') && !id.includes('\\') && !id.includes('.');
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!validId(id)) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid download id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const filePath = path.join(storeDir(), `${id}.pdf`);
  // Containment: resolved path must stay inside the store dir.
  if (path.dirname(path.resolve(filePath)) !== path.resolve(storeDir())) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid download id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'File expired or not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (Date.now() - stat.mtimeMs > STORE_TTL_MS) {
    await fs.unlink(filePath).catch(() => undefined);
    return new Response(JSON.stringify({ success: false, error: 'File expired. Please compress again.' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  sweepStore().catch(() => undefined);

  const filename = sanitizeFilename(req.nextUrl.searchParams.get('filename') || 'compressed.pdf');
  const nodeStream = (await import('node:fs')).createReadStream(filePath);

  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': stat.size.toString(),
      'Cache-Control': 'no-store',
    },
  });
}
