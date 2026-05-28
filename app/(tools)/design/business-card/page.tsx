'use client';

import { useEffect, useRef, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Download, FlipHorizontal, Image as ImageIcon, FileText, Contact as ContactIcon } from 'lucide-react';
import { downloadBlob, downloadText } from '@/lib/utils';

const CARD_W = 1050; // 3.5" @ 300 DPI
const CARD_H = 600;  // 2.0" @ 300 DPI

type Template = 'modern' | 'classic' | 'minimal' | 'bold';

interface CardData {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  tagline: string;
  primary: string;
  accent: string;
  bg: string;
  text: string;
  template: Template;
  logoDataUrl: string | null;
}

const DEFAULT: CardData = {
  name: 'Alex Morgan',
  title: 'Product Designer',
  company: 'Acme Studio',
  email: 'alex@acme.studio',
  phone: '+1 555 0123',
  website: 'alex.studio',
  address: 'San Francisco, CA',
  tagline: 'Designing what matters.',
  primary: '#6366F1',
  accent: '#0EA5E9',
  bg: '#FFFFFF',
  text: '#111827',
  template: 'modern',
  logoDataUrl: null,
};

function buildVCard(d: CardData): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${d.name}`];
  if (d.company) lines.push(`ORG:${d.company}`);
  if (d.title) lines.push(`TITLE:${d.title}`);
  if (d.email) lines.push(`EMAIL;TYPE=WORK:${d.email}`);
  if (d.phone) lines.push(`TEL;TYPE=WORK,VOICE:${d.phone}`);
  if (d.website) lines.push(`URL:${d.website.startsWith('http') ? d.website : `https://${d.website}`}`);
  if (d.address) lines.push(`ADR;TYPE=WORK:;;${d.address};;;;`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

async function drawFront(ctx: CanvasRenderingContext2D, d: CardData) {
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = d.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  if (d.template === 'modern') {
    // Left accent bar
    const grad = ctx.createLinearGradient(0, 0, 320, CARD_H);
    grad.addColorStop(0, d.primary);
    grad.addColorStop(1, d.accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, CARD_H);

    if (d.logoDataUrl) {
      const img = await loadImage(d.logoDataUrl);
      drawContainedImage(ctx, img, 60, 60, 200, 200);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 140px Inter, system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials(d.name), 80, 200);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '24px Inter, system-ui, sans-serif';
    ctx.fillText(d.company, 60, CARD_H - 60);

    drawContact(ctx, d, 380, 80, d.text);
  } else if (d.template === 'classic') {
    // Centered
    ctx.fillStyle = d.text;
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(d.name, CARD_W / 2, 200);

    ctx.fillStyle = d.primary;
    ctx.font = '28px Inter, system-ui, sans-serif';
    ctx.fillText(d.title, CARD_W / 2, 250);

    // Divider
    ctx.strokeStyle = d.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CARD_W / 2 - 80, 290);
    ctx.lineTo(CARD_W / 2 + 80, 290);
    ctx.stroke();

    ctx.fillStyle = d.text;
    ctx.font = '24px Inter, system-ui, sans-serif';
    const rows = [d.company, d.email, d.phone, d.website].filter(Boolean);
    rows.forEach((row, i) => ctx.fillText(row, CARD_W / 2, 350 + i * 42));
    ctx.textAlign = 'left';
  } else if (d.template === 'minimal') {
    // Border
    ctx.strokeStyle = d.primary;
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, CARD_W - 60, CARD_H - 60);

    ctx.fillStyle = d.text;
    ctx.font = 'bold 64px Inter, system-ui, sans-serif';
    ctx.fillText(d.name, 80, 160);

    ctx.fillStyle = d.primary;
    ctx.font = '28px Inter, system-ui, sans-serif';
    ctx.fillText(`${d.title}${d.company ? ' · ' + d.company : ''}`, 80, 210);

    drawContact(ctx, d, 80, 290, d.text);
  } else {
    // Bold: full color background
    const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    grad.addColorStop(0, d.primary);
    grad.addColorStop(1, d.accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 84px Inter, system-ui, sans-serif';
    ctx.fillText(d.name, 70, 180);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '32px Inter, system-ui, sans-serif';
    ctx.fillText(`${d.title}${d.company ? ' · ' + d.company : ''}`, 70, 235);

    drawContact(ctx, d, 70, 320, 'rgba(255,255,255,0.95)');
  }
}

async function drawBack(ctx: CanvasRenderingContext2D, d: CardData, qrDataUrl: string | null) {
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  // Background
  if (d.template === 'bold') {
    const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    grad.addColorStop(0, d.primary);
    grad.addColorStop(1, d.accent);
    ctx.fillStyle = grad;
  } else if (d.template === 'modern') {
    ctx.fillStyle = d.primary;
  } else {
    ctx.fillStyle = d.bg;
  }
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const onDark = d.template === 'bold' || d.template === 'modern';
  const textColor = onDark ? '#FFFFFF' : d.text;
  const subColor = onDark ? 'rgba(255,255,255,0.85)' : d.primary;

  // QR code (right)
  if (qrDataUrl) {
    const img = await loadImage(qrDataUrl);
    const size = 380;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(CARD_W - size - 70, (CARD_H - size) / 2, size, size);
    ctx.drawImage(img, CARD_W - size - 70, (CARD_H - size) / 2, size, size);
  }

  // Left side — company + tagline
  ctx.fillStyle = textColor;
  ctx.font = 'bold 56px Inter, system-ui, sans-serif';
  ctx.fillText(d.company || d.name, 80, 180);

  if (d.tagline) {
    ctx.fillStyle = subColor;
    ctx.font = 'italic 26px Inter, system-ui, sans-serif';
    wrapText(ctx, d.tagline, 80, 240, 480, 36);
  }

  ctx.fillStyle = subColor;
  ctx.font = '22px Inter, system-ui, sans-serif';
  ctx.fillText('Scan to save contact', 80, CARD_H - 80);
}

function drawContact(ctx: CanvasRenderingContext2D, d: CardData, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.font = 'bold 48px Inter, system-ui, sans-serif';
  if (d.template !== 'minimal') ctx.fillText(d.name, x, y + 50);

  ctx.font = '24px Inter, system-ui, sans-serif';
  if (d.template !== 'minimal') ctx.fillText(d.title, x, y + 90);

  ctx.font = '22px Inter, system-ui, sans-serif';
  const rows = [
    d.phone && `📞  ${d.phone}`,
    d.email && `✉  ${d.email}`,
    d.website && `🌐  ${d.website}`,
    d.address && `📍  ${d.address}`,
  ].filter(Boolean) as string[];

  const baseY = d.template === 'minimal' ? y : y + 160;
  rows.forEach((row, i) => ctx.fillText(row, x, baseY + i * 40));
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, yy);
      line = w + ' ';
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trim(), x, yy);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function drawContainedImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.min(w / img.width, h / img.height);
  const dw = img.width * r, dh = img.height * r;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('');
}

const TEMPLATES: { id: Template; label: string }[] = [
  { id: 'modern', label: 'Modern' },
  { id: 'classic', label: 'Classic' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold' },
];

export default function BusinessCardPage() {
  const [data, setData] = useState<CardData>(DEFAULT);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function update<K extends keyof CardData>(key: K, value: CardData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  // Generate QR (vCard) whenever contact data changes
  useEffect(() => {
    (async () => {
      const QR = (await import('qrcode')).default;
      const url = await QR.toDataURL(buildVCard(data), { width: 600, margin: 1, errorCorrectionLevel: 'M' });
      setQrDataUrl(url);
    })();
  }, [data.name, data.title, data.company, data.email, data.phone, data.website, data.address]);

  // Re-render preview canvas when anything changes
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    if (side === 'front') drawFront(ctx, data);
    else drawBack(ctx, data, qrDataUrl);
  }, [data, side, qrDataUrl]);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => update('logoDataUrl', reader.result as string);
    reader.readAsDataURL(f);
  }

  async function renderOffscreen(target: 'front' | 'back'): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d')!;
    if (target === 'front') await drawFront(ctx, data);
    else await drawBack(ctx, data, qrDataUrl);
    return canvas;
  }

  async function exportPng(target: 'front' | 'back') {
    const canvas = await renderOffscreen(target);
    canvas.toBlob((b) => {
      if (b) downloadBlob(b, `business-card-${target}.png`);
    }, 'image/png');
  }

  async function exportPdf() {
    const { jsPDF } = await import('jspdf');
    // 3.5 x 2 inches at 72pt/in = 252 x 144 pt
    const pdf = new jsPDF({ orientation: 'l', unit: 'pt', format: [252, 144] });
    const front = await renderOffscreen('front');
    pdf.addImage(front.toDataURL('image/png'), 'PNG', 0, 0, 252, 144);
    pdf.addPage([252, 144], 'l');
    const back = await renderOffscreen('back');
    pdf.addImage(back.toDataURL('image/png'), 'PNG', 0, 0, 252, 144);
    downloadBlob(pdf.output('blob'), 'business-card.pdf');
  }

  function exportVcf() {
    downloadText(buildVCard(data), `${data.name.replace(/\s+/g, '-').toLowerCase() || 'contact'}.vcf`, 'text/vcard');
  }

  function exportQr() {
    if (!qrDataUrl) return;
    fetch(qrDataUrl).then((r) => r.blob()).then((b) => downloadBlob(b, 'business-card-qr.png'));
  }

  return (
    <ToolLayout slug="design/business-card">
      <div className="grid lg:grid-cols-[420px_1fr] gap-6">
        {/* ───── Form ───── */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Template</div>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <Button
                    key={t.id}
                    variant={data.template === t.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => update('template', t.id)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <Field label="Full name"  value={data.name}    onChange={(v) => update('name', v)} />
              <Field label="Job title"  value={data.title}   onChange={(v) => update('title', v)} />
              <Field label="Company"    value={data.company} onChange={(v) => update('company', v)} />
              <Field label="Email"      value={data.email}   onChange={(v) => update('email', v)} type="email" />
              <Field label="Phone"      value={data.phone}   onChange={(v) => update('phone', v)} />
              <Field label="Website"    value={data.website} onChange={(v) => update('website', v)} />
              <Field label="Address"    value={data.address} onChange={(v) => update('address', v)} />

              <div className="space-y-1">
                <Label>Tagline (back)</Label>
                <Textarea value={data.tagline} onChange={(e) => update('tagline', e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Colors</div>
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Primary"    value={data.primary} onChange={(v) => update('primary', v)} />
                <ColorField label="Accent"     value={data.accent}  onChange={(v) => update('accent', v)} />
                <ColorField label="Background" value={data.bg}      onChange={(v) => update('bg', v)} />
                <ColorField label="Text"       value={data.text}    onChange={(v) => update('text', v)} />
              </div>

              <div className="space-y-1">
                <Label>Logo (optional, used in Modern template)</Label>
                <Input type="file" accept="image/*" onChange={handleLogoUpload} />
                {data.logoDataUrl && (
                  <Button size="sm" variant="ghost" onClick={() => update('logoDataUrl', null)}>Remove logo</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ───── Preview & Export ───── */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Preview ({side})</div>
                <Button size="sm" variant="outline" onClick={() => setSide(side === 'front' ? 'back' : 'front')}>
                  <FlipHorizontal className="h-4 w-4" /> Flip
                </Button>
              </div>
              <div className="bg-muted/40 rounded-lg p-6 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={CARD_W}
                  height={CARD_H}
                  className="w-full max-w-[640px] h-auto rounded-md shadow-md border bg-white"
                />
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Standard size: 3.5″ × 2″ ({CARD_W} × {CARD_H} px @ 300 DPI)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Export</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button onClick={() => exportPng('front')}><ImageIcon /> PNG (front)</Button>
                <Button onClick={() => exportPng('back')} variant="outline"><ImageIcon /> PNG (back)</Button>
                <Button onClick={exportPdf} variant="outline"><FileText /> PDF (both)</Button>
                <Button onClick={exportVcf} variant="outline"><ContactIcon /> vCard (.vcf)</Button>
              </div>
              <Button onClick={exportQr} variant="ghost" size="sm" disabled={!qrDataUrl}>
                <Download className="h-4 w-4" /> Download QR only
              </Button>
              <p className="text-xs text-muted-foreground">
                The QR code on the back encodes a vCard — anyone scanning it gets your full contact info saved instantly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ToolLayout>
  );
}

function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type ?? 'text'} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-1">
        <Input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-10 w-14 p-1" />
        <Input value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="font-mono text-sm" />
      </div>
    </div>
  );
}
