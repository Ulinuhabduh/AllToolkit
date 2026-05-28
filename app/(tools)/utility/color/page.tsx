'use client';

import { useMemo, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let v = m[1];
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export default function ColorToolsPage() {
  const [hex, setHex] = useState('#6366F1');
  const rgb = useMemo(() => hexToRgb(hex), [hex]);
  const hsl = rgb ? rgbToHsl(...rgb) : null;

  const palette = useMemo(() => {
    if (!hsl) return [];
    const [h, s, l] = hsl;
    return [10, 25, 40, 55, 70, 85].map((tone) => {
      const newL = tone;
      const a = Math.min(1, s / 100);
      return hslToHex(h, s, newL);
    });
  }, [hsl]);

  return (
    <ToolLayout slug="utility/color">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={hex} onChange={(e) => setHex(e.target.value.toUpperCase())} className="h-12 w-16 p-1" />
                <Input value={hex} onChange={(e) => setHex(e.target.value.toUpperCase())} className="font-mono" />
              </div>
            </div>
            <div className="h-32 rounded-lg border" style={{ background: hex }} />
            <ColorRow label="HEX" value={hex} />
            {rgb && <ColorRow label="RGB" value={`rgb(${rgb.join(', ')})`} />}
            {hsl && <ColorRow label="HSL" value={`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`} />}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-medium">Monochromatic palette</div>
            <div className="grid grid-cols-6 gap-2">
              {palette.map((c) => (
                <button key={c} onClick={() => navigator.clipboard.writeText(c)} className="aspect-square rounded-lg border group relative" style={{ background: c }} title={`Copy ${c}`}>
                  <span className="absolute inset-x-0 bottom-0 text-[10px] font-mono bg-black/50 text-white rounded-b-lg opacity-0 group-hover:opacity-100 transition">{c}</span>
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">Click to copy.</div>
          </CardContent>
        </Card>
      </div>
    </ToolLayout>
  );
}

function ColorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
      <span className="text-xs uppercase text-muted-foreground w-12">{label}</span>
      <span className="font-mono text-sm flex-1 truncate">{value}</span>
      <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(value)}><Copy className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
