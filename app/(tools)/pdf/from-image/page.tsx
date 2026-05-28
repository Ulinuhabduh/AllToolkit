'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowUp, ArrowDown, Download, Loader2 } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

type PageSize = 'auto' | 'a4' | 'letter';

export default function ImageToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [loading, setLoading] = useState(false);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    const next = [...files];
    [next[i], next[j]] = [next[j], next[i]];
    setFiles(next);
  }

  async function handleConvert() {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const sizes: Record<Exclude<PageSize, 'auto'>, [number, number]> = {
        a4: [595.28, 841.89],
        letter: [612, 792],
      };

      const first = files[0];
      const firstDataUrl = await fileToDataUrl(first);
      const firstImg = await loadImg(firstDataUrl);
      let pdf;
      if (pageSize === 'auto') {
        pdf = new jsPDF({ orientation: firstImg.width > firstImg.height ? 'l' : 'p', unit: 'px', format: [firstImg.width, firstImg.height] });
        pdf.addImage(firstDataUrl, 'JPEG', 0, 0, firstImg.width, firstImg.height);
      } else {
        const [pw, ph] = sizes[pageSize];
        pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: pageSize });
        const { w, h, x, y } = fitInPage(firstImg.width, firstImg.height, pw, ph);
        pdf.addImage(firstDataUrl, 'JPEG', x, y, w, h);
      }

      for (let i = 1; i < files.length; i++) {
        const dataUrl = await fileToDataUrl(files[i]);
        const img = await loadImg(dataUrl);
        if (pageSize === 'auto') {
          pdf.addPage([img.width, img.height], img.width > img.height ? 'l' : 'p');
          pdf.addImage(dataUrl, 'JPEG', 0, 0, img.width, img.height);
        } else {
          pdf.addPage();
          const [pw, ph] = sizes[pageSize];
          const { w, h, x, y } = fitInPage(img.width, img.height, pw, ph);
          pdf.addImage(dataUrl, 'JPEG', x, y, w, h);
        }
      }

      const blob = pdf.output('blob');
      downloadBlob(blob, 'images.pdf');
    } catch (e) {
      console.error(e);
      alert('Failed to convert to PDF.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout slug="pdf/from-image">
      <div className="space-y-6">
        <FileDropzone
          accept="image/*"
          multiple
          onFiles={(fs) => setFiles([...files, ...fs])}
          label="Choose images"
          hint="Reorder with the arrow buttons"
        />

        {files.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Page size</Label>
                <div className="flex gap-2">
                  {(['a4', 'letter', 'auto'] as PageSize[]).map((s) => (
                    <Button key={s} variant={pageSize === s ? 'default' : 'outline'} size="sm" onClick={() => setPageSize(s)}>
                      {s.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="divide-y border rounded-lg">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 text-sm">
                    <span className="w-6 text-muted-foreground">{i + 1}.</span>
                    <span className="flex-1 truncate">{f.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === files.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>Remove</Button>
                  </div>
                ))}
              </div>

              <Button onClick={handleConvert} disabled={loading} size="lg">
                {loading ? <><Loader2 className="animate-spin" /> Processing...</> : <><Download /> Convert to PDF</>}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ToolLayout>
  );
}

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}
function fitInPage(iw: number, ih: number, pw: number, ph: number) {
  const margin = 20;
  const aw = pw - margin * 2, ah = ph - margin * 2;
  const r = Math.min(aw / iw, ah / ih);
  const w = iw * r, h = ih * r;
  return { w, h, x: (pw - w) / 2, y: (ph - h) / 2 };
}
