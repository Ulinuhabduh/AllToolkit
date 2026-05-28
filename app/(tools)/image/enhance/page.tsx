'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

export default function EnhancePage() {
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState(2);
  const [sharpen, setSharpen] = useState(0.7);
  const [saturation, setSaturation] = useState(1.1);
  const [contrast, setContrast] = useState(1.05);
  const [result, setResult] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEnhance() {
    if (!file) return;
    setLoading(true);
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((r) => (img.onload = r));
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = `saturate(${saturation}) contrast(${contrast})`;
      ctx.drawImage(img, 0, 0, w, h);

      if (sharpen > 0) {
        const src = ctx.getImageData(0, 0, w, h);
        const dst = ctx.createImageData(w, h);
        const k = sharpen;
        const kernel = [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0];
        const s = src.data, d = dst.data;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            for (let c = 0; c < 3; c++) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const i = ((y + ky) * w + (x + kx)) * 4 + c;
                  sum += s[i] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
              }
              const idx = (y * w + x) * 4 + c;
              d[idx] = Math.max(0, Math.min(255, sum));
            }
            const ai = (y * w + x) * 4 + 3;
            d[ai] = s[ai];
          }
        }
        ctx.putImageData(dst, 0, 0);
      }

      canvas.toBlob((b) => { if (b) setResult(b); setLoading(false); }, 'image/png');
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <ToolLayout slug="image/enhance">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Lightweight canvas-based enhancer: upscale + sharpen + saturation/contrast. A true AI upscale model (TF.js) will be added in a future release.
        </p>
        {!file ? (
          <FileDropzone accept="image/*" onFiles={(fs) => { setFile(fs[0]); setResult(null); }} />
        ) : (
          <>
            <Card>
              <CardContent className="p-4 grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scale: {scale}x</Label>
                  <Input type="range" min="1" max="4" step="0.5" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Sharpen: {sharpen.toFixed(2)}</Label>
                  <Input type="range" min="0" max="2" step="0.05" value={sharpen} onChange={(e) => setSharpen(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Saturation: {saturation.toFixed(2)}</Label>
                  <Input type="range" min="0.5" max="1.8" step="0.05" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Contrast: {contrast.toFixed(2)}</Label>
                  <Input type="range" min="0.5" max="1.8" step="0.05" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button onClick={handleEnhance} size="lg" disabled={loading}>
                    {loading ? <><Loader2 className="animate-spin" /> Processing...</> : 'Enhance'}
                  </Button>
                  <Button variant="outline" onClick={() => { setFile(null); setResult(null); }}>Change image</Button>
                </div>
              </CardContent>
            </Card>

            {result && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <img src={URL.createObjectURL(result)} alt="Enhanced" className="max-w-full h-auto rounded-lg border" />
                  <Button onClick={() => downloadBlob(result, `enhanced-${file?.name?.replace(/\.[^.]+$/, '') ?? 'image'}.png`)}>
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
