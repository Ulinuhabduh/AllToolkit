'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

const CDN_URL = 'https://esm.sh/@imgly/background-removal@1.5.5';

export default function RemoveBgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleProcess() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress(0);
    setStage('Loading AI model...');
    try {
      const mod: any = await import(/* webpackIgnore: true */ CDN_URL);
      const removeBackground = mod.removeBackground ?? mod.default?.removeBackground ?? mod.default;
      if (typeof removeBackground !== 'function') {
        throw new Error('The remove-bg library failed to load correctly.');
      }
      const blob: Blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          setStage(key);
          if (total > 0) setProgress(Math.round((current / total) * 100));
        },
      });
      setResult(URL.createObjectURL(blob));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to process the image');
    } finally {
      setLoading(false);
      setStage('');
    }
  }

  function handleDownload() {
    if (!result) return;
    fetch(result).then((r) => r.blob()).then((b) => {
      const name = file?.name.replace(/\.[^.]+$/, '') || 'image';
      downloadBlob(b, `${name}-no-bg.png`);
    });
  }

  return (
    <ToolLayout slug="image/remove-bg">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          The AI library (~40MB) is loaded from a CDN on first use, then cached by the browser.
          Processing runs entirely in your browser.
        </p>

        {!file ? (
          <FileDropzone
            accept="image/*"
            onFiles={(fs) => { setFile(fs[0]); setResult(null); setError(null); }}
            label="Choose an image"
            hint="PNG, JPG, WebP — max 20MB"
            maxSizeMB={20}
          />
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs font-medium uppercase text-muted-foreground mb-2">Original</div>
                  <img src={URL.createObjectURL(file)} alt="Original" className="w-full h-auto rounded-lg" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs font-medium uppercase text-muted-foreground mb-2">Result</div>
                  {result ? (
                    <div className="rounded-lg overflow-hidden" style={{
                      backgroundImage: 'conic-gradient(at 50% 50%, #ddd 25%, #fff 0 50%, #ddd 0 75%, #fff 0)',
                      backgroundSize: '20px 20px',
                    }}>
                      <img src={result} alt="Result" className="w-full h-auto" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 rounded-lg bg-muted text-sm text-muted-foreground text-center px-4">
                      {loading ? (
                        <div>
                          <div>{stage || 'Processing...'}</div>
                          <div className="font-semibold text-lg mt-1">{progress}%</div>
                        </div>
                      ) : 'Not processed yet'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {error && <div className="text-sm text-destructive">⚠ {error}</div>}

            <div className="flex flex-wrap gap-2">
              {!result && (
                <Button onClick={handleProcess} disabled={loading} size="lg">
                  {loading ? <><Loader2 className="animate-spin" /> Processing {progress}%</> : 'Remove Background'}
                </Button>
              )}
              {result && (
                <Button onClick={handleDownload} size="lg">
                  <Download /> Download PNG
                </Button>
              )}
              <Button variant="outline" onClick={() => { setFile(null); setResult(null); setError(null); }}>
                New image
              </Button>
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
