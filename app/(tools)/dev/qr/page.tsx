'use client';

import { useEffect, useRef, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

export default function QrPage() {
  const [text, setText] = useState('https://example.com');
  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(2);
  const [color, setColor] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !text) return;
    (async () => {
      const QR = (await import('qrcode')).default;
      await QR.toCanvas(canvasRef.current, text, {
        width: size,
        margin,
        color: { dark: color, light: bg },
        errorCorrectionLevel: 'M',
      });
    })();
  }, [text, size, margin, color, bg]);

  function downloadPng() {
    canvasRef.current?.toBlob((b) => b && downloadBlob(b, 'qrcode.png'), 'image/png');
  }

  return (
    <ToolLayout slug="dev/qr">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Content (text or URL)</Label>
                <Input value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Size: {size}px</Label>
                <Input type="range" min="120" max="800" step="20" value={size} onChange={(e) => setSize(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Margin: {margin}</Label>
                <Input type="range" min="0" max="8" value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Foreground</Label>
                  <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 p-1" />
                </div>
                <div className="space-y-1">
                  <Label>Background</Label>
                  <Input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-10 p-1" />
                </div>
              </div>
              <Button onClick={downloadPng}><Download /> Download PNG</Button>
            </div>
            <div className="flex items-center justify-center bg-muted rounded-lg p-4">
              <canvas ref={canvasRef} />
            </div>
          </CardContent>
        </Card>
      </div>
    </ToolLayout>
  );
}
