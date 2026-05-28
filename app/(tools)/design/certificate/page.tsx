'use client';

import { useEffect, useRef, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Download, Image as ImageIcon } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

// A4 landscape @ 150 DPI ≈ 1754 × 1240. We use 150 DPI for canvas perf, scale up on PDF.
const W = 1754;
const H = 1240;

type Template = 'classic' | 'modern' | 'achievement';

interface CertData {
  template: Template;
  title: string;
  presented: string;
  recipient: string;
  description: string;
  date: string;
  signer1Name: string;
  signer1Role: string;
  signer2Name: string;
  signer2Role: string;
  organization: string;
  primary: string;
  accent: string;
  logoDataUrl: string | null;
}

const DEFAULT: CertData = {
  template: 'classic',
  title: 'Certificate of Completion',
  presented: 'This certificate is proudly presented to',
  recipient: 'Recipient Name',
  description: 'for successfully completing the Web Development Bootcamp\nwith outstanding achievement.',
  date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  signer1Name: 'Jane Smith',
  signer1Role: 'Director',
  signer2Name: 'John Doe',
  signer2Role: 'Instructor',
  organization: 'ACME ACADEMY',
  primary: '#1E3A8A',
  accent: '#D4AF37',
  logoDataUrl: null,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

async function draw(ctx: CanvasRenderingContext2D, d: CertData) {
  ctx.clearRect(0, 0, W, H);

  if (d.template === 'classic') {
    // Background
    ctx.fillStyle = '#FFFEF7';
    ctx.fillRect(0, 0, W, H);
    // Outer border
    ctx.strokeStyle = d.primary;
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.strokeStyle = d.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, W - 120, H - 120);
    // Ornament corners
    drawCornerOrnament(ctx, 60, 60, d.accent, 'tl');
    drawCornerOrnament(ctx, W - 60, 60, d.accent, 'tr');
    drawCornerOrnament(ctx, 60, H - 60, d.accent, 'bl');
    drawCornerOrnament(ctx, W - 60, H - 60, d.accent, 'br');

    drawHeader(ctx, d, 220);
    drawBody(ctx, d, 380);
    drawSigners(ctx, d, H - 200);
  } else if (d.template === 'modern') {
    // Gradient bg
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(1, '#F9FAFB');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Side bar
    ctx.fillStyle = d.primary;
    ctx.fillRect(0, 0, 80, H);
    // Top thin accent
    ctx.fillStyle = d.accent;
    ctx.fillRect(80, 0, W - 80, 8);

    drawHeader(ctx, d, 220);
    drawBody(ctx, d, 380);
    drawSigners(ctx, d, H - 200);
  } else {
    // achievement: gold-ish, dark border
    ctx.fillStyle = '#FFFBEB';
    ctx.fillRect(0, 0, W, H);
    // Thick double border
    ctx.strokeStyle = d.primary;
    ctx.lineWidth = 14;
    ctx.strokeRect(70, 70, W - 140, H - 140);
    ctx.strokeStyle = d.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(95, 95, W - 190, H - 190);

    // Big seal
    ctx.fillStyle = d.accent;
    ctx.beginPath();
    ctx.arc(W - 230, H - 230, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = d.primary;
    ctx.beginPath();
    ctx.arc(W - 230, H - 230, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = d.accent;
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'center';
    ctx.fillText('AWARD', W - 230, H - 220);

    drawHeader(ctx, d, 240);
    drawBody(ctx, d, 400);
    drawSigners(ctx, d, H - 220);
  }

  if (d.logoDataUrl) {
    try {
      const img = await loadImage(d.logoDataUrl);
      const lh = 100;
      const lw = (img.width / img.height) * lh;
      ctx.drawImage(img, (W - lw) / 2, 110, lw, lh);
    } catch {}
  }
}

function drawCornerOrnament(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, corner: 'tl' | 'tr' | 'bl' | 'br') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  const len = 50;
  ctx.beginPath();
  if (corner === 'tl') { ctx.moveTo(x + len, y); ctx.lineTo(x, y); ctx.lineTo(x, y + len); }
  if (corner === 'tr') { ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.lineTo(x, y + len); }
  if (corner === 'bl') { ctx.moveTo(x + len, y); ctx.lineTo(x, y); ctx.lineTo(x, y - len); }
  if (corner === 'br') { ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.lineTo(x, y - len); }
  ctx.stroke();
}

function drawHeader(ctx: CanvasRenderingContext2D, d: CertData, yStart: number) {
  ctx.textAlign = 'center';
  ctx.fillStyle = d.primary;

  if (d.organization) {
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.fillText(d.organization.toUpperCase(), W / 2, yStart);
  }
  ctx.font = 'bold 72px Georgia, serif';
  ctx.fillStyle = '#1F2937';
  ctx.fillText(d.title, W / 2, yStart + 80);

  // underline accent
  ctx.fillStyle = d.accent;
  ctx.fillRect(W / 2 - 100, yStart + 100, 200, 4);
}

function drawBody(ctx: CanvasRenderingContext2D, d: CertData, yStart: number) {
  ctx.textAlign = 'center';

  ctx.fillStyle = '#555';
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText(d.presented, W / 2, yStart);

  ctx.fillStyle = '#111';
  ctx.font = 'bold 80px "Times New Roman", serif';
  ctx.fillText(d.recipient, W / 2, yStart + 110);

  // Description (multi-line)
  ctx.fillStyle = '#444';
  ctx.font = '26px Georgia, serif';
  const lines = d.description.split('\n');
  lines.forEach((line, i) => ctx.fillText(line, W / 2, yStart + 180 + i * 36));
}

function drawSigners(ctx: CanvasRenderingContext2D, d: CertData, y: number) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#111';

  const left = W / 2 - 320;
  const right = W / 2 + 320;

  function block(x: number, name: string, role: string) {
    if (!name && !role) return;
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 150, y);
    ctx.lineTo(x + 150, y);
    ctx.stroke();
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.fillText(name, x, y + 28);
    ctx.font = '20px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(role, x, y + 56);
    ctx.fillStyle = '#111';
  }

  block(left, d.signer1Name, d.signer1Role);
  block(right, d.signer2Name, d.signer2Role);

  // Date center
  if (d.date) {
    ctx.font = '22px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(d.date, W / 2, y + 30);
  }
}

const TEMPLATES: { id: Template; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'achievement', label: 'Achievement' },
];

export default function CertificatePage() {
  const [d, setD] = useState<CertData>(DEFAULT);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function update<K extends keyof CertData>(k: K, v: CertData[K]) {
    setD((p) => ({ ...p, [k]: v }));
  }
  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => update('logoDataUrl', r.result as string);
    r.readAsDataURL(f);
  }

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) draw(ctx, d);
  }, [d]);

  async function exportPng() {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    await draw(ctx, d);
    c.toBlob((b) => b && downloadBlob(b, `certificate-${d.recipient.replace(/\s+/g, '-').toLowerCase() || 'untitled'}.png`), 'image/png');
  }

  async function exportPdf() {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    await draw(ctx, d);
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pw, ph);
    downloadBlob(pdf.output('blob'), `certificate-${d.recipient.replace(/\s+/g, '-').toLowerCase() || 'untitled'}.pdf`);
  }

  return (
    <ToolLayout slug="design/certificate">
      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Template</div>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map((t) => (
                  <Button key={t.id} size="sm" variant={d.template === t.id ? 'default' : 'outline'} onClick={() => update('template', t.id)}>{t.label}</Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1"><Label>Organization</Label><Input value={d.organization} onChange={(e) => update('organization', e.target.value)} /></div>
              <div className="space-y-1"><Label>Title</Label><Input value={d.title} onChange={(e) => update('title', e.target.value)} /></div>
              <div className="space-y-1"><Label>Subtitle line</Label><Input value={d.presented} onChange={(e) => update('presented', e.target.value)} /></div>
              <div className="space-y-1"><Label>Recipient name</Label><Input value={d.recipient} onChange={(e) => update('recipient', e.target.value)} /></div>
              <div className="space-y-1"><Label>Description</Label><Textarea value={d.description} onChange={(e) => update('description', e.target.value)} rows={3} /></div>
              <div className="space-y-1"><Label>Date</Label><Input value={d.date} onChange={(e) => update('date', e.target.value)} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Signers</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Left name</Label><Input value={d.signer1Name} onChange={(e) => update('signer1Name', e.target.value)} /></div>
                <div className="space-y-1"><Label>Left role</Label><Input value={d.signer1Role} onChange={(e) => update('signer1Role', e.target.value)} /></div>
                <div className="space-y-1"><Label>Right name</Label><Input value={d.signer2Name} onChange={(e) => update('signer2Name', e.target.value)} /></div>
                <div className="space-y-1"><Label>Right role</Label><Input value={d.signer2Role} onChange={(e) => update('signer2Role', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Primary</Label><Input type="color" value={d.primary} onChange={(e) => update('primary', e.target.value.toUpperCase())} className="h-10 p-1" /></div>
                <div className="space-y-1"><Label>Accent</Label><Input type="color" value={d.accent} onChange={(e) => update('accent', e.target.value.toUpperCase())} className="h-10 p-1" /></div>
              </div>
              <div className="space-y-1">
                <Label>Logo (optional)</Label>
                <Input type="file" accept="image/*" onChange={handleLogo} />
                {d.logoDataUrl && <Button size="sm" variant="ghost" onClick={() => update('logoDataUrl', null)}>Remove logo</Button>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="bg-muted/40 rounded-lg p-4 flex items-center justify-center">
                <canvas ref={canvasRef} width={W} height={H} className="w-full h-auto rounded-md shadow-md border bg-white" />
              </div>
              <div className="text-xs text-muted-foreground text-center mt-2">A4 landscape — {W}×{H} px preview</div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={exportPdf} size="lg"><Download /> Download PDF</Button>
            <Button onClick={exportPng} variant="outline"><ImageIcon /> Download PNG</Button>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
