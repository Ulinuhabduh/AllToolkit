'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Download, Printer } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

type Template = 'classic' | 'modern' | 'minimal';

interface LetterheadData {
  template: Template;
  companyName: string;
  companyTagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoDataUrl: string | null;
  primary: string;
  accent: string;
  // Letter body
  recipient: string;
  recipientAddress: string;
  date: string;
  subject: string;
  body: string;
  signerName: string;
  signerRole: string;
  letterheadOnly: boolean;
}

const DEFAULT: LetterheadData = {
  template: 'modern',
  companyName: 'Acme Corporation',
  companyTagline: 'Building tomorrow, today.',
  address: 'Jl. Sudirman Kav. 10\nJakarta 10110, Indonesia',
  phone: '+62 21 555 0123',
  email: 'hello@acme.co.id',
  website: 'www.acme.co.id',
  logoDataUrl: null,
  primary: '#1E3A8A',
  accent: '#D4AF37',
  recipient: 'Mr. John Doe',
  recipientAddress: 'PT Sample Indonesia\nJl. Thamrin 1, Jakarta',
  date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  subject: 'Letter Subject',
  body: 'Dear Mr. Doe,\n\nWe are pleased to write to you regarding [topic]. This is a sample letter body. You can replace this with your own content, and it will be rendered in the PDF maintaining proper spacing and line breaks.\n\nThank you for your kind attention.\n\nBest regards,',
  signerName: 'Jane Smith',
  signerRole: 'Director',
  letterheadOnly: false,
};

export default function LetterheadPage() {
  const [d, setD] = useState<LetterheadData>(DEFAULT);

  function update<K extends keyof LetterheadData>(k: K, v: LetterheadData[K]) {
    setD((p) => ({ ...p, [k]: v }));
  }
  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => update('logoDataUrl', r.result as string);
    r.readAsDataURL(f);
  }

  async function exportPdf() {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const M = 50;

    // ─── Header ───
    if (d.template === 'modern') {
      // Side color bar
      pdf.setFillColor(d.primary);
      pdf.rect(0, 0, 8, H, 'F');
      pdf.setFillColor(d.accent);
      pdf.rect(0, 0, W, 4, 'F');
    } else if (d.template === 'classic') {
      // Center divider
      pdf.setDrawColor(d.primary);
      pdf.setLineWidth(2);
      pdf.line(M, 110, W - M, 110);
      pdf.setDrawColor(d.accent);
      pdf.setLineWidth(0.5);
      pdf.line(M, 114, W - M, 114);
    }

    let headerY = 50;
    if (d.logoDataUrl) {
      try { pdf.addImage(d.logoDataUrl, 'PNG', M, headerY, 60, 60); } catch {}
    }

    pdf.setTextColor(d.primary);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    const headerX = d.logoDataUrl ? M + 75 : M;
    pdf.text(d.companyName, headerX, headerY + 30);

    if (d.companyTagline) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(10);
      pdf.setTextColor('#666');
      pdf.text(d.companyTagline, headerX, headerY + 48);
    }

    // Right-side contact
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor('#444');
    const contactLines = [
      ...d.address.split('\n'),
      d.phone,
      d.email,
      d.website,
    ].filter(Boolean);
    contactLines.forEach((ln, i) => pdf.text(ln, W - M, headerY + 18 + i * 11, { align: 'right' }));

    let y = 150;

    if (!d.letterheadOnly) {
      // Recipient block
      pdf.setTextColor('#999');
      pdf.setFontSize(9);
      pdf.text('To:', M, y);
      pdf.setTextColor('#000');
      pdf.setFontSize(11);
      pdf.text(d.recipient, M, y + 14);
      pdf.setFontSize(9);
      pdf.setTextColor('#555');
      const recLines = d.recipientAddress.split('\n');
      recLines.forEach((ln, i) => pdf.text(ln, M, y + 28 + i * 12));

      pdf.setTextColor('#999');
      pdf.text('Date:', W - M - 100, y);
      pdf.setTextColor('#000');
      pdf.text(d.date, W - M, y + 14, { align: 'right' });

      y += 50 + recLines.length * 12;

      // Subject
      if (d.subject) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor('#000');
        pdf.text(`Subject: ${d.subject}`, M, y);
        y += 24;
      }

      // Body
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor('#222');
      const paragraphs = d.body.split('\n');
      for (const para of paragraphs) {
        if (!para.trim()) { y += 12; continue; }
        const lines = pdf.splitTextToSize(para, W - 2 * M);
        for (const line of lines) {
          if (y > H - 100) { pdf.addPage(); y = M; }
          pdf.text(line, M, y);
          y += 16;
        }
      }

      // Signer block
      y += 50;
      if (y > H - 100) { pdf.addPage(); y = M + 50; }
      pdf.setFont('helvetica', 'bold');
      pdf.text(d.signerName, M, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor('#666');
      pdf.text(d.signerRole, M, y + 14);
    }

    // ─── Footer ───
    pdf.setFontSize(8);
    pdf.setTextColor('#999');
    pdf.text(`${d.companyName} · ${d.email || ''} · ${d.website || ''}`, W / 2, H - 30, { align: 'center' });

    downloadBlob(pdf.output('blob'), `letter-${(d.subject || 'letterhead').replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  return (
    <ToolLayout slug="design/letterhead">
      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Template</div>
              <div className="grid grid-cols-3 gap-2">
                {(['modern', 'classic', 'minimal'] as Template[]).map((t) => (
                  <Button key={t} size="sm" variant={d.template === t ? 'default' : 'outline'} onClick={() => update('template', t)}>{t}</Button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={d.letterheadOnly} onChange={(e) => update('letterheadOnly', e.target.checked)} />
                Letterhead only (no letter body)
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Company</div>
              <div className="space-y-1"><Label>Logo</Label><Input type="file" accept="image/*" onChange={handleLogo} />
                {d.logoDataUrl && <Button size="sm" variant="ghost" onClick={() => update('logoDataUrl', null)}>Remove</Button>}
              </div>
              <div className="space-y-1"><Label>Name</Label><Input value={d.companyName} onChange={(e) => update('companyName', e.target.value)} /></div>
              <div className="space-y-1"><Label>Tagline</Label><Input value={d.companyTagline} onChange={(e) => update('companyTagline', e.target.value)} /></div>
              <div className="space-y-1"><Label>Address</Label><Textarea value={d.address} onChange={(e) => update('address', e.target.value)} rows={2} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Phone</Label><Input value={d.phone} onChange={(e) => update('phone', e.target.value)} /></div>
                <div className="space-y-1"><Label>Email</Label><Input value={d.email} onChange={(e) => update('email', e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>Website</Label><Input value={d.website} onChange={(e) => update('website', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Primary</Label><Input type="color" value={d.primary} onChange={(e) => update('primary', e.target.value.toUpperCase())} className="h-10 p-1" /></div>
                <div className="space-y-1"><Label>Accent</Label><Input type="color" value={d.accent} onChange={(e) => update('accent', e.target.value.toUpperCase())} className="h-10 p-1" /></div>
              </div>
            </CardContent>
          </Card>

          {!d.letterheadOnly && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="text-sm font-medium">Letter content</div>
                <div className="space-y-1"><Label>Recipient</Label><Input value={d.recipient} onChange={(e) => update('recipient', e.target.value)} /></div>
                <div className="space-y-1"><Label>Recipient address</Label><Textarea value={d.recipientAddress} onChange={(e) => update('recipientAddress', e.target.value)} rows={2} /></div>
                <div className="space-y-1"><Label>Date</Label><Input value={d.date} onChange={(e) => update('date', e.target.value)} /></div>
                <div className="space-y-1"><Label>Subject</Label><Input value={d.subject} onChange={(e) => update('subject', e.target.value)} /></div>
                <div className="space-y-1"><Label>Body</Label><Textarea value={d.body} onChange={(e) => update('body', e.target.value)} rows={8} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Signer name</Label><Input value={d.signerName} onChange={(e) => update('signerName', e.target.value)} /></div>
                  <div className="space-y-1"><Label>Signer role</Label><Input value={d.signerRole} onChange={(e) => update('signerRole', e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0 bg-white">
              <div className="relative w-full" style={{ aspectRatio: '210 / 297' }}>
                {/* Modern: left bar + top accent */}
                {d.template === 'modern' && (
                  <>
                    <div className="absolute left-0 top-0 h-full w-2" style={{ background: d.primary }} />
                    <div className="absolute left-0 top-0 right-0 h-[3px]" style={{ background: d.accent }} />
                  </>
                )}

                <div className="absolute inset-0 px-8 py-8 text-black">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {d.logoDataUrl && <img src={d.logoDataUrl} alt="" className="h-14 w-14 object-contain" />}
                      <div>
                        <div className="text-xl font-bold" style={{ color: d.primary }}>{d.companyName}</div>
                        {d.companyTagline && <div className="text-xs italic text-gray-500">{d.companyTagline}</div>}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-gray-600 leading-tight">
                      <div className="whitespace-pre-line">{d.address}</div>
                      <div>{d.phone}</div>
                      <div>{d.email}</div>
                      <div>{d.website}</div>
                    </div>
                  </div>

                  {d.template === 'classic' && (
                    <div className="mt-2">
                      <div className="h-[2px]" style={{ background: d.primary }} />
                      <div className="h-[1px] mt-[2px]" style={{ background: d.accent }} />
                    </div>
                  )}

                  {!d.letterheadOnly && (
                    <div className="mt-8 text-xs space-y-4">
                      <div className="flex justify-between">
                        <div>
                          <div className="text-[10px] uppercase text-gray-500">To</div>
                          <div className="font-medium">{d.recipient}</div>
                          <div className="text-gray-600 whitespace-pre-line">{d.recipientAddress}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-gray-500">Date</div>
                          <div>{d.date}</div>
                        </div>
                      </div>
                      {d.subject && <div><strong>Subject:</strong> {d.subject}</div>}
                      <div className="whitespace-pre-line leading-relaxed">{d.body}</div>
                      <div className="pt-6">
                        <div className="font-medium">{d.signerName}</div>
                        <div className="text-gray-600">{d.signerRole}</div>
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-0 right-0 text-center text-[9px] text-gray-400">
                    {d.companyName} · {d.email} · {d.website}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={exportPdf} size="lg"><Download /> Download PDF</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
