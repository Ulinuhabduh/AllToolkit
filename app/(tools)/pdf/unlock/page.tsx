'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

export default function UnlockPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  async function handleUnlock() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const pdfjs = await import('pdfjs-dist');
      // @ts-ignore
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const data = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data, password }).promise;

      const { PDFDocument } = await import('pdf-lib');
      const out = await PDFDocument.create();

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const jpegBytes = await (await fetch(jpegDataUrl)).arrayBuffer();
        const image = await out.embedJpg(jpegBytes);
        const p = out.addPage([viewport.width, viewport.height]);
        p.drawImage(image, { x: 0, y: 0, width: viewport.width, height: viewport.height });
      }

      const bytes = await out.save();
      setResult(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
    } catch (e: any) {
      const msg = e?.name === 'PasswordException' || /password/i.test(e?.message ?? '')
        ? 'Wrong password or this file requires a password.'
        : (e?.message ?? 'Failed to process the PDF.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout slug="pdf/unlock">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Enter the password to open a locked PDF, then the file is re-saved without protection.
          The output is rasterized (pages become images) — fine for read/print, not for further text editing.
        </p>

        {!file ? (
          <FileDropzone accept=".pdf,application/pdf" onFiles={(fs) => { setFile(fs[0]); setError(null); setResult(null); }} />
        ) : (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="text-sm">
                <span className="font-medium">{file.name}</span>
              </div>
              <div className="space-y-1">
                <Label>PDF password</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Toggle visibility"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {error && <div className="text-sm text-destructive">⚠ {error}</div>}

              <div className="flex gap-2">
                {!result ? (
                  <Button onClick={handleUnlock} disabled={loading} size="lg">
                    {loading ? <><Loader2 className="animate-spin" /> Unlocking...</> : <><KeyRound /> Unlock</>}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => downloadBlob(result, `unlocked-${file.name}`)}
                  >
                    <Download /> Download PDF
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setFile(null); setPassword(''); setError(null); setResult(null); }}>
                  New file
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ToolLayout>
  );
}
