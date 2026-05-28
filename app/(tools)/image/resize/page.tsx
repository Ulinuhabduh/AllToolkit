'use client';

import { useEffect, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Link2, Link2Off } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

export default function ResizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [imgDim, setImgDim] = useState<{ w: number; h: number } | null>(null);
  const [w, setW] = useState(800);
  const [h, setH] = useState(600);
  const [lock, setLock] = useState(true);
  const [result, setResult] = useState<Blob | null>(null);

  useEffect(() => {
    if (!file) { setImgDim(null); return; }
    const img = new Image();
    img.onload = () => {
      setImgDim({ w: img.naturalWidth, h: img.naturalHeight });
      setW(img.naturalWidth);
      setH(img.naturalHeight);
    };
    img.src = URL.createObjectURL(file);
  }, [file]);

  function changeW(v: number) {
    setW(v);
    if (lock && imgDim) setH(Math.round((v / imgDim.w) * imgDim.h));
  }
  function changeH(v: number) {
    setH(v);
    if (lock && imgDim) setW(Math.round((v / imgDim.h) * imgDim.w));
  }

  async function handleResize() {
    if (!file) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((r) => (img.onload = r));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob((b) => b && setResult(b), file.type || 'image/png', 0.92);
  }

  return (
    <ToolLayout slug="image/resize">
      <div className="space-y-6">
        {!file ? (
          <FileDropzone accept="image/*" onFiles={(fs) => setFile(fs[0])} label="Choose an image to resize" />
        ) : (
          <>
            <Card>
              <CardContent className="p-4 space-y-4">
                {imgDim && (
                  <div className="text-sm text-muted-foreground">
                    Original size: {imgDim.w} × {imgDim.h} px
                  </div>
                )}
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  <div className="space-y-1">
                    <Label>Width (px)</Label>
                    <Input type="number" value={w} onChange={(e) => changeW(Number(e.target.value))} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setLock(!lock)} aria-label="Lock aspect ratio">
                    {lock ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
                  </Button>
                  <div className="space-y-1">
                    <Label>Height (px)</Label>
                    <Input type="number" value={h} onChange={(e) => changeH(Number(e.target.value))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleResize} size="lg">Resize</Button>
                  <Button variant="outline" onClick={() => { setFile(null); setResult(null); }}>Change image</Button>
                </div>
              </CardContent>
            </Card>

            {result && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="text-xs uppercase font-medium text-muted-foreground">Result</div>
                  <img src={URL.createObjectURL(result)} alt="Resized" className="max-w-full h-auto rounded-lg border" />
                  <Button onClick={() => downloadBlob(result, `resized-${file?.name ?? 'image.png'}`)}>
                    <Download /> Download
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
