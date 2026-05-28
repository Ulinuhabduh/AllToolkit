'use client';

import { useEffect, useRef, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

interface Preset {
  id: string;
  label: string;
  group: string;
  /** mm */
  w: number;
  h: number;
  desc?: string;
}

const PRESETS: Preset[] = [
  // Indonesia
  { id: 'id-ktp', label: 'KTP 3×4', group: 'Indonesia', w: 30, h: 40 },
  { id: 'id-2x3', label: 'Pas Foto 2×3', group: 'Indonesia', w: 20, h: 30 },
  { id: 'id-4x6', label: 'Pas Foto 4×6', group: 'Indonesia', w: 40, h: 60 },
  { id: 'id-sim', label: 'SIM 2×3', group: 'Indonesia', w: 20, h: 30 },
  { id: 'id-passport', label: 'Paspor RI 4×6', group: 'Indonesia', w: 40, h: 60 },
  // International
  { id: 'us-passport', label: 'US Passport 2×2"', group: 'International', w: 51, h: 51 },
  { id: 'us-visa', label: 'US Visa 2×2"', group: 'International', w: 51, h: 51 },
  { id: 'uk-passport', label: 'UK Passport', group: 'International', w: 35, h: 45 },
  { id: 'eu-schengen', label: 'EU/Schengen Visa', group: 'International', w: 35, h: 45 },
  { id: 'jp-passport', label: 'Japan Passport', group: 'International', w: 35, h: 45 },
  { id: 'cn-visa', label: 'China Visa', group: 'International', w: 33, h: 48 },
  // Generic
  { id: 'square', label: 'Square 1:1', group: 'Generic', w: 50, h: 50 },
  { id: 'profile', label: 'Profile 4:5', group: 'Generic', w: 40, h: 50 },
];

const DPI = 300;
const mmToPx = (mm: number) => Math.round((mm / 25.4) * DPI);

const BG_OPTIONS = [
  { id: 'white', color: '#FFFFFF', label: 'White' },
  { id: 'red',   color: '#D9352B', label: 'Red' },
  { id: 'blue',  color: '#1652A0', label: 'Blue' },
  { id: 'gray',  color: '#E5E7EB', label: 'Gray' },
  { id: 'transparent', color: 'transparent', label: 'Transparent' },
];

export default function IdPhotoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [bg, setBg] = useState(BG_OPTIONS[0]);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!file) { setImg(null); return; }
    const i = new Image();
    i.onload = () => {
      setImg(i);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    i.src = URL.createObjectURL(file);
  }, [file]);

  function drawTo(canvas: HTMLCanvasElement, w: number, h: number) {
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    if (bg.color !== 'transparent') {
      ctx.fillStyle = bg.color;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    if (!img) return;
    // Fit cover with zoom and offset
    const scale = Math.max(w / img.width, h / img.height) * zoom;
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (w - dw) / 2 + offsetX * (w / 100);
    const dy = (h - dh) / 2 + offsetY * (h / 100);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  useEffect(() => {
    if (!previewRef.current) return;
    drawTo(previewRef.current, mmToPx(preset.w), mmToPx(preset.h));
  }, [img, preset, bg, zoom, offsetX, offsetY]);

  function exportSingle(format: 'png' | 'jpeg') {
    const c = document.createElement('canvas');
    drawTo(c, mmToPx(preset.w), mmToPx(preset.h));
    c.toBlob((b) => b && downloadBlob(b, `id-photo-${preset.id}.${format === 'jpeg' ? 'jpg' : 'png'}`),
      format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
  }

  function exportSheet() {
    // 4R photo paper (4"×6" = 102×152 mm @ 300dpi = 1200×1800 px)
    const W = mmToPx(102), H = mmToPx(152);
    const sheet = document.createElement('canvas');
    sheet.width = W;
    sheet.height = H;
    const ctx = sheet.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    const pw = mmToPx(preset.w);
    const ph = mmToPx(preset.h);
    const gap = mmToPx(3);
    const cols = Math.floor((W + gap) / (pw + gap));
    const rows = Math.floor((H + gap) / (ph + gap));
    const totalW = cols * pw + (cols - 1) * gap;
    const totalH = rows * ph + (rows - 1) * gap;
    const offX = (W - totalW) / 2;
    const offY = (H - totalH) / 2;

    const single = document.createElement('canvas');
    drawTo(single, pw, ph);

    // cutting lines (subtle)
    ctx.strokeStyle = '#bbb';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offX + c * (pw + gap);
        const y = offY + r * (ph + gap);
        ctx.drawImage(single, x, y);
        ctx.strokeRect(x, y, pw, ph);
      }
    }

    sheet.toBlob(
      (b) => b && downloadBlob(b, `id-photo-${preset.id}-sheet-4R-${cols}x${rows}.jpg`),
      'image/jpeg',
      0.95
    );
  }

  const groups = Array.from(new Set(PRESETS.map((p) => p.group)));

  return (
    <ToolLayout slug="image/id-photo">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Crop & resize foto sesuai ukuran resmi: KTP, SIM, paspor, visa. Atur posisi & ukuran, lalu export single atau jadi 1 lembar 4R (siap cetak).
        </p>

        {!file ? (
          <FileDropzone
            accept="image/*"
            onFiles={(fs) => setFile(fs[0])}
            label="Choose a photo"
            hint="Use a portrait taken from the front. Higher resolution = better print quality."
          />
        ) : (
          <div className="grid lg:grid-cols-[360px_1fr] gap-6">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm font-medium">Size preset</div>
                  {groups.map((g) => (
                    <div key={g} className="space-y-1">
                      <div className="text-xs uppercase text-muted-foreground">{g}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESETS.filter((p) => p.group === g).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setPreset(p)}
                            className={`text-left rounded-lg border p-2 text-sm hover:border-foreground/40 ${preset.id === p.id ? 'border-primary bg-primary/5' : ''}`}
                          >
                            <div className="font-medium">{p.label}</div>
                            <div className="text-xs text-muted-foreground">{p.w}×{p.h} mm</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm font-medium">Background</div>
                  <div className="flex gap-2 flex-wrap">
                    {BG_OPTIONS.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBg(b)}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm ${bg.id === b.id ? 'border-primary' : ''}`}
                      >
                        <span className="h-4 w-4 rounded border" style={{ background: b.color === 'transparent' ? 'conic-gradient(#ddd 25%, #fff 0 50%, #ddd 0 75%, #fff 0)' : b.color, backgroundSize: '8px 8px' }} />
                        {b.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm font-medium">Position & zoom</div>
                  <div className="space-y-1">
                    <Label>Zoom: {zoom.toFixed(2)}x</Label>
                    <Input type="range" min="0.5" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Horizontal: {offsetX}%</Label>
                    <Input type="range" min="-50" max="50" value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Vertical: {offsetY}%</Label>
                    <Input type="range" min="-50" max="50" value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{preset.label} · {preset.w}×{preset.h} mm @ {DPI} DPI</div>
                    <div className="text-xs text-muted-foreground">{mmToPx(preset.w)} × {mmToPx(preset.h)} px</div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-6 flex items-center justify-center min-h-[400px]">
                    <canvas
                      ref={previewRef}
                      className="rounded-md shadow-md border bg-white"
                      style={{ width: `${preset.w * 6}px`, height: `${preset.h * 6}px`, maxWidth: '100%', maxHeight: '500px' }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm font-medium">Export</div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => exportSingle('jpeg')}><Download /> JPG</Button>
                    <Button onClick={() => exportSingle('png')} variant="outline"><Download /> PNG</Button>
                    <Button onClick={exportSheet} variant="outline"><Download /> 4R Sheet (multi-up)</Button>
                    <Button variant="ghost" onClick={() => setFile(null)}>New photo</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">4R sheet is 102×152 mm with cutting guides — beri ke percetakan pas foto biasa.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
