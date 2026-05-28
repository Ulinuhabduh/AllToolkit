'use client';

import { useRef, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

type Box = { x: number; y: number; w: number; h: number };

export default function CropPage() {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [box, setBox] = useState<Box>({ x: 50, y: 50, w: 200, h: 200 });
  const [drag, setDrag] = useState<null | { ox: number; oy: number; sx: number; sy: number }>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [result, setResult] = useState<Blob | null>(null);

  function onLoadImg() {
    if (!imgRef.current) return;
    const w = imgRef.current.clientWidth;
    const h = imgRef.current.clientHeight;
    setBox({ x: w * 0.1, y: h * 0.1, w: w * 0.8, h: h * 0.8 });
  }

  function startDrag(e: React.MouseEvent) {
    setDrag({ ox: e.clientX, oy: e.clientY, sx: box.x, sy: box.y });
  }
  function onMove(e: React.MouseEvent) {
    if (!drag || !imgRef.current) return;
    const dx = e.clientX - drag.ox;
    const dy = e.clientY - drag.oy;
    const maxX = imgRef.current.clientWidth - box.w;
    const maxY = imgRef.current.clientHeight - box.h;
    setBox({ ...box, x: Math.max(0, Math.min(maxX, drag.sx + dx)), y: Math.max(0, Math.min(maxY, drag.sy + dy)) });
  }
  function endDrag() { setDrag(null); }

  async function handleCrop() {
    if (!file || !imgRef.current) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((r) => (img.onload = r));
    const scaleX = img.naturalWidth / imgRef.current.clientWidth;
    const scaleY = img.naturalHeight / imgRef.current.clientHeight;
    const canvas = document.createElement('canvas');
    canvas.width = box.w * scaleX;
    canvas.height = box.h * scaleY;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, box.x * scaleX, box.y * scaleY, box.w * scaleX, box.h * scaleY, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => b && setResult(b), file.type || 'image/png', 0.95);
  }

  return (
    <ToolLayout slug="image/crop">
      <div className="space-y-6">
        {!file ? (
          <FileDropzone accept="image/*" onFiles={(fs) => {
            setFile(fs[0]);
            setImgUrl(URL.createObjectURL(fs[0]));
            setResult(null);
          }} />
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div
                  ref={wrapperRef}
                  className="relative inline-block select-none"
                  onMouseMove={onMove}
                  onMouseUp={endDrag}
                  onMouseLeave={endDrag}
                >
                  <img
                    ref={imgRef}
                    src={imgUrl!}
                    onLoad={onLoadImg}
                    alt="Crop source"
                    className="max-w-full max-h-[500px] h-auto rounded-lg block"
                    draggable={false}
                  />
                  <div
                    onMouseDown={startDrag}
                    className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
                    style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleCrop}>Crop</Button>
                  <Button variant="outline" onClick={() => { setFile(null); setResult(null); }}>Change image</Button>
                </div>
              </CardContent>
            </Card>

            {result && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="text-xs uppercase font-medium text-muted-foreground">Result</div>
                  <img src={URL.createObjectURL(result)} alt="Cropped" className="max-w-full h-auto rounded-lg border" />
                  <Button onClick={() => downloadBlob(result, `cropped-${file?.name ?? 'image.png'}`)}>
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
