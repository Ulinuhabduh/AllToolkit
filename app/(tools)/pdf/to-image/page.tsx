'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, Loader2 } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

export default function PdfToImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState(2);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ url: string; blob: Blob; page: number }[]>([]);

  async function handleConvert() {
    if (!file) return;
    setLoading(true);
    setResults([]);
    try {
      const pdfjs = await import('pdfjs-dist');
      // @ts-ignore
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const data = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data }).promise;
      const out: { url: string; blob: Blob; page: number }[] = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), `image/${format}`, 0.92));
        out.push({ url: URL.createObjectURL(blob), blob, page: p });
      }
      setResults(out);
    } catch (e) {
      console.error(e);
      alert('Failed to convert PDF.');
    } finally {
      setLoading(false);
    }
  }

  async function downloadAll() {
    if (results.length === 0) return;
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const base = file?.name.replace(/\.pdf$/i, '') ?? 'pdf';
    results.forEach((r) => zip.file(`${base}-page-${r.page}.${format}`, r.blob));
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `${base}-images.zip`);
  }

  return (
    <ToolLayout slug="pdf/to-image">
      <div className="space-y-6">
        {!file ? (
          <FileDropzone accept=".pdf,application/pdf" onFiles={(fs) => setFile(fs[0])} />
        ) : (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scale (relative DPI): {scale}x</Label>
                  <Input type="range" min="1" max="4" step="0.5" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <div className="flex gap-2">
                    {(['png', 'jpeg'] as const).map((f) => (
                      <Button key={f} variant={format === f ? 'default' : 'outline'} size="sm" onClick={() => setFormat(f)}>{f.toUpperCase()}</Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleConvert} disabled={loading} size="lg">
                  {loading ? <><Loader2 className="animate-spin" /> Processing...</> : 'Convert'}
                </Button>
                <Button variant="outline" onClick={() => { setFile(null); setResults([]); }}>Change file</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{results.length} pages</div>
                <Button onClick={downloadAll}><Download /> Download all (.zip)</Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {results.map((r) => (
                  <a key={r.page} href={r.url} download={`page-${r.page}.${format}`} className="block border rounded-lg overflow-hidden hover:border-foreground/40">
                    <img src={r.url} alt={`Page ${r.page}`} className="w-full h-auto" />
                    <div className="text-xs text-center py-1 bg-muted">Page {r.page}</div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ToolLayout>
  );
}
