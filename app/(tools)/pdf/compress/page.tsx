'use client';

import { useEffect, useRef, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Download, Loader2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { cn } from '@/lib/utils';

type LevelId = 'extreme' | 'recommended' | 'less';

interface Level {
  id: LevelId;
  title: string;
  desc: string;
  hint: string;
}

const LEVELS: Level[] = [
  {
    id: 'extreme',
    title: 'EXTREME COMPRESSION',
    desc: 'Less quality, high compression',
    hint: 'Ukuran sekecil mungkin (±85–95% pada PDF gambar/scan). Untuk upload, email & arsip cepat.',
  },
  {
    id: 'recommended',
    title: 'RECOMMENDED COMPRESSION',
    desc: 'Good quality, good compression',
    hint: 'Seimbang (±60–80%). Tetap tajam untuk layar & cetak normal. Default.',
  },
  {
    id: 'less',
    title: 'LESS COMPRESSION',
    desc: 'High quality, less compression',
    hint: 'Kualitas prioritas (±25–50%). Untuk cetak & arsip. Teks/vektor tidak disentuh berlebih.',
  },
];

interface CompressResponse {
  success: boolean;
  mode?: LevelId;
  originalSize?: number;
  compressedSize?: number;
  savedBytes?: number;
  savedPercentage?: number;
  pages?: number;
  processingTimeMs?: number;
  fallback?: boolean;
  fallbackReason?: string | null;
  downloadUrl?: string;
  error?: string;
}

export default function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [levelId, setLevelId] = useState<LevelId>('recommended');
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<CompressResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const level = LEVELS.find((l) => l.id === levelId)!;

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  async function handleCompress() {
    if (!file || loading) return;
    setLoading(true);
    setResult(null);
    setErrorMsg(null);
    setElapsed(0);
    const t0 = Date.now();
    timer.current = setInterval(() => setElapsed((Date.now() - t0) / 1000), 250);

    try {
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('mode', levelId);

      const res = await fetch('/api/pdf/compress', { method: 'POST', body: form });
      const json = (await res.json().catch(() => null)) as CompressResponse | null;

      if (!json) throw new Error(`Server merespons ${res.status} tanpa JSON.`);
      if (!res.ok || !json.success) {
        throw new Error(json?.error || `Server error (${res.status}).`);
      }
      setResult(json);
    } catch (e) {
      console.error('[compress] failed:', e);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setErrorMsg(null);
    setElapsed(0);
  }

  return (
    <ToolLayout slug="pdf/compress">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Server-side engine (Ghostscript + qpdf + libvips/sharp): optimasi struktur, downsampling gambar
          per-profile, font & stream compression — <strong>teks dan vektor dipertahankan</strong>, bukan
          raster satu halaman penuh. Pilih level sesuai kebutuhan.
        </p>

        {!file ? (
          <FileDropzone
            accept=".pdf,application/pdf"
            maxSizeMB={50}
            onFiles={(fs) => {
              setFile(fs[0]);
              setResult(null);
              setErrorMsg(null);
            }}
            label="Choose a PDF to compress"
            hint="Max 50 MB • diproses di server lalu otomatis dihapus (TTL 15 menit)"
          />
        ) : (
          <>
            {/* Compression level selector — seperti iLovePDF */}
            <div className="overflow-hidden rounded-xl border bg-white dark:bg-card shadow-sm">
              <div className="py-4 text-center">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-foreground">
                  Compression level
                </h2>
              </div>
              <div className="border-t">
                {LEVELS.map((l) => {
                  const active = l.id === levelId;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      disabled={loading}
                      onClick={() => setLevelId(l.id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-4 border-b px-5 py-4 text-left transition-colors last:border-b-0',
                        active
                          ? 'bg-[#eef0fd] dark:bg-primary/10'
                          : 'bg-white hover:bg-slate-50 dark:bg-card dark:hover:bg-muted/40'
                      )}
                    >
                      <span>
                        <span className="block text-sm font-bold tracking-wide text-red-600 dark:text-red-400">
                          {l.title}
                        </span>
                        <span className="block text-sm text-slate-700 dark:text-muted-foreground">
                          {l.desc}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400">{l.hint}</span>
                      </span>
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all',
                          active ? 'bg-green-500 text-white' : 'bg-transparent text-transparent'
                        )}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="text-sm">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-muted-foreground">Original: {formatBytes(file.size)}</div>

                  {loading && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground">
                        Compressing ({level.title.toLowerCase()})… {elapsed.toFixed(0)}s — menganalisis
                        gambar/teks/vektor lalu multi-pass optimization
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                      </div>
                    </div>
                  )}

                  {result?.success && (
                    <div className="mt-1 space-y-0.5 text-muted-foreground">
                      <div>
                        Compressed: {formatBytes(result.compressedSize ?? 0)}{' '}
                        <span className="font-semibold text-emerald-600">
                          (−{(result.savedPercentage ?? 0).toFixed(1)}% • hemat{' '}
                          {formatBytes(result.savedBytes ?? 0)})
                        </span>
                      </div>
                      <div className="text-xs">
                        {result.pages} pages • mode {result.mode} •{' '}
                        {((result.processingTimeMs ?? 0) / 1000).toFixed(1)}s
                      </div>
                      {result.fallback && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                          File sudah optimal — dikembalikan original. {result.fallbackReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive">
                    <span className="font-bold">Gagal kompres: </span>
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {!result ? (
                    <Button onClick={handleCompress} disabled={loading} size="lg">
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" /> Processing...
                        </>
                      ) : (
                        'Compress'
                      )}
                    </Button>
                  ) : (
                    <Button size="lg" asChild>
                      <a href={result.downloadUrl}>
                        <Download /> Download
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" disabled={loading} onClick={reset}>
                    New file
                  </Button>
                  {result && (
                    <Button variant="ghost" disabled={loading} onClick={handleCompress}>
                      Re-compress with another level
                    </Button>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Teks tetap bisa di-select, bookmark/link/form dipertahankan, page count & ukuran halaman
                  tidak berubah. Jika hasil tidak lebih kecil ≥1%, file original dikembalikan otomatis.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
