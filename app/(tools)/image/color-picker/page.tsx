'use client';

import { useRef, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export default function ColorPickerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  function onLoadImg() {
    if (!imgRef.current || !canvasRef.current) return;
    const c = canvasRef.current;
    c.width = imgRef.current.naturalWidth;
    c.height = imgRef.current.naturalHeight;
    c.getContext('2d')!.drawImage(imgRef.current, 0, 0);
  }

  function onClickImg(e: React.MouseEvent<HTMLImageElement>) {
    if (!imgRef.current || !canvasRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * imgRef.current.naturalWidth;
    const y = ((e.clientY - rect.top) / rect.height) * imgRef.current.naturalHeight;
    const data = canvasRef.current.getContext('2d')!.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(data[0], data[1], data[2]);
    setCurrent(hex);
    setPicked((p) => (p.includes(hex) ? p : [hex, ...p].slice(0, 12)));
  }

  function copy(hex: string) { navigator.clipboard.writeText(hex); }

  return (
    <ToolLayout slug="image/color-picker">
      <div className="space-y-6">
        {!file ? (
          <FileDropzone accept="image/*" onFiles={(fs) => { setFile(fs[0]); setPicked([]); }} label="Choose an image to pick colors from" />
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-3">Click anywhere on the image to pick a color.</p>
                <img
                  ref={imgRef}
                  src={URL.createObjectURL(file)}
                  alt="Pick"
                  onLoad={onLoadImg}
                  onClick={onClickImg}
                  className="max-w-full max-h-[500px] h-auto rounded-lg border cursor-crosshair"
                />
                <canvas ref={canvasRef} className="hidden" />
                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setFile(null); setPicked([]); }}>Change image</Button>
              </CardContent>
            </Card>

            {current && (
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg border" style={{ background: current }} />
                  <div>
                    <div className="text-sm uppercase text-muted-foreground">Last picked</div>
                    <div className="font-mono text-2xl font-bold">{current}</div>
                  </div>
                  <Button variant="outline" onClick={() => copy(current)}><Copy /> Copy</Button>
                </CardContent>
              </Card>
            )}

            {picked.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium mb-3">Picked palette</div>
                  <div className="flex flex-wrap gap-2">
                    {picked.map((h) => (
                      <button key={h} onClick={() => copy(h)} className="group flex items-center gap-2 rounded-lg border px-2 py-1 hover:bg-muted">
                        <span className="h-6 w-6 rounded" style={{ background: h }} />
                        <span className="font-mono text-sm">{h}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
