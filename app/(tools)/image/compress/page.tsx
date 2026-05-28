'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { downloadBlob, formatBytes } from '@/lib/utils';

type Result = { blob: Blob; url: string; size: number };

export default function CompressPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [quality, setQuality] = useState(0.7);
  const [maxWidthOrHeight, setMaxWidthOrHeight] = useState(1920);

  async function handleCompress() {
    if (files.length === 0) return;
    setLoading(true);
    const imageCompression = (await import('browser-image-compression')).default;
    const out: Result[] = [];
    for (const file of files) {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 50,
          maxWidthOrHeight,
          useWebWorker: true,
          initialQuality: quality,
        });
        out.push({ blob: compressed, url: URL.createObjectURL(compressed), size: compressed.size });
      } catch (e) {
        console.error(e);
      }
    }
    setResults(out);
    setLoading(false);
  }

  function downloadOne(idx: number) {
    const r = results[idx];
    const f = files[idx];
    if (!r || !f) return;
    downloadBlob(r.blob, `compressed-${f.name}`);
  }

  return (
    <ToolLayout slug="image/compress">
      <div className="space-y-6">
        <FileDropzone
          accept="image/*"
          multiple
          onFiles={(fs) => { setFiles(fs); setResults([]); }}
          files={files}
          onRemove={(i) => setFiles(files.filter((_, idx) => idx !== i))}
          label="Choose images to compress"
          hint="Multiple files allowed. PNG/JPG/WebP."
          maxSizeMB={50}
        />

        {files.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quality: {Math.round(quality * 100)}%</Label>
                  <Input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max dimension (px): {maxWidthOrHeight}</Label>
                  <Input
                    type="range"
                    min="320"
                    max="4000"
                    step="80"
                    value={maxWidthOrHeight}
                    onChange={(e) => setMaxWidthOrHeight(Number(e.target.value))}
                  />
                </div>
              </div>
              <Button onClick={handleCompress} disabled={loading} size="lg">
                {loading ? <><Loader2 className="animate-spin" /> Processing...</> : 'Compress'}
              </Button>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {results.map((r, i) => {
                  const orig = files[i].size;
                  const saved = ((1 - r.size / orig) * 100).toFixed(1);
                  return (
                    <li key={i} className="flex items-center justify-between gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{files[i].name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatBytes(orig)} → {formatBytes(r.size)} <span className="text-emerald-600 font-medium">(−{saved}%)</span>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => downloadOne(i)}><Download /> Download</Button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </ToolLayout>
  );
}
