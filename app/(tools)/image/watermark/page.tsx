'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('© AllTools');
  const [opacity, setOpacity] = useState(0.5);
  const [size, setSize] = useState(48);
  const [position, setPosition] = useState<Position>('bottom-right');
  const [result, setResult] = useState<Blob | null>(null);

  async function handleApply() {
    if (!file) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((r) => (img.onload = r));
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    ctx.font = `bold ${size}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = `rgba(255,255,255,${opacity})`;
    ctx.strokeStyle = `rgba(0,0,0,${opacity * 0.5})`;
    ctx.lineWidth = Math.max(1, size / 24);
    const m = ctx.measureText(text);
    const pad = size * 0.6;
    let x = pad, y = size + pad;
    switch (position) {
      case 'top-right': x = canvas.width - m.width - pad; y = size + pad; break;
      case 'bottom-left': x = pad; y = canvas.height - pad; break;
      case 'bottom-right': x = canvas.width - m.width - pad; y = canvas.height - pad; break;
      case 'center': x = (canvas.width - m.width) / 2; y = canvas.height / 2; break;
    }
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    canvas.toBlob((b) => b && setResult(b), file.type || 'image/png', 0.95);
  }

  return (
    <ToolLayout slug="image/watermark">
      <div className="space-y-6">
        {!file ? (
          <FileDropzone accept="image/*" onFiles={(fs) => { setFile(fs[0]); setResult(null); }} />
        ) : (
          <>
            <Card>
              <CardContent className="p-4 grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Watermark text</Label>
                  <Input value={text} onChange={(e) => setText(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Size: {size}px</Label>
                  <Input type="range" min="12" max="160" value={size} onChange={(e) => setSize(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Opacity: {Math.round(opacity * 100)}%</Label>
                  <Input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'] as Position[]).map((p) => (
                      <Button key={p} variant={position === p ? 'default' : 'outline'} size="sm" onClick={() => setPosition(p)}>
                        {p.replace('-', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button onClick={handleApply} size="lg">Apply Watermark</Button>
                  <Button variant="outline" onClick={() => { setFile(null); setResult(null); }}>Change image</Button>
                </div>
              </CardContent>
            </Card>

            {result && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <img src={URL.createObjectURL(result)} alt="Watermarked" className="max-w-full h-auto rounded-lg border" />
                  <Button onClick={() => downloadBlob(result, `watermarked-${file?.name ?? 'image.png'}`)}>
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
