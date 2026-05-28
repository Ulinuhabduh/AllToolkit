'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

const FORMATS = [
  { value: 'image/png', label: 'PNG', ext: 'png' },
  { value: 'image/jpeg', label: 'JPEG', ext: 'jpg' },
  { value: 'image/webp', label: 'WebP', ext: 'webp' },
];

function convertImage(file: File, mime: string, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      if (mime === 'image/jpeg') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), mime, quality);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}

export default function ConvertPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [results, setResults] = useState<{ blob: Blob; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleConvert() {
    setLoading(true);
    const out: { blob: Blob; name: string }[] = [];
    for (const f of files) {
      try {
        const blob = await convertImage(f, format.value);
        const base = f.name.replace(/\.[^.]+$/, '');
        out.push({ blob, name: `${base}.${format.ext}` });
      } catch (e) {
        console.error(e);
      }
    }
    setResults(out);
    setLoading(false);
  }

  return (
    <ToolLayout slug="image/convert">
      <div className="space-y-6">
        <FileDropzone
          accept="image/*"
          multiple
          onFiles={(fs) => { setFiles(fs); setResults([]); }}
          files={files}
          onRemove={(i) => setFiles(files.filter((_, idx) => idx !== i))}
          label="Choose images"
          hint="Supports PNG, JPG, WebP, GIF, BMP"
        />

        {files.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="mb-2 block">Convert to:</Label>
                <div className="flex gap-2">
                  {FORMATS.map((f) => (
                    <Button
                      key={f.value}
                      variant={format.value === f.value ? 'default' : 'outline'}
                      onClick={() => setFormat(f)}
                    >{f.label}</Button>
                  ))}
                </div>
              </div>
              <Button onClick={handleConvert} disabled={loading} size="lg">
                {loading ? <><Loader2 className="animate-spin" /> Processing...</> : `Convert to ${format.label}`}
              </Button>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {results.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 p-4">
                    <span className="truncate font-medium">{r.name}</span>
                    <Button size="sm" onClick={() => downloadBlob(r.blob, r.name)}><Download /> Download</Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </ToolLayout>
  );
}
