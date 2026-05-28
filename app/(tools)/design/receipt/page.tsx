'use client';

import { useMemo, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Download, Printer } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

type Style = 'formal' | 'thermal';

interface Item { id: string; description: string; qty: number; price: number; }

interface ReceiptData {
  style: Style;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  receiptNo: string;
  date: string;
  cashier: string;
  customer: string;
  paymentMethod: string;
  currency: string;
  taxRate: number;
  items: Item[];
  notes: string;
  // formal extras
  payerName: string;
  amountText: string;
  purpose: string;
  signerName: string;
  signerRole: string;
}

const DEFAULT: ReceiptData = {
  style: 'thermal',
  businessName: 'Toko Berkah',
  businessAddress: 'Jl. Merdeka 12, Jakarta',
  businessPhone: '+62 21 123 4567',
  receiptNo: `R-${Date.now().toString().slice(-6)}`,
  date: new Date().toLocaleString(),
  cashier: 'Andi',
  customer: '',
  paymentMethod: 'Cash',
  currency: 'IDR',
  taxRate: 0,
  items: [
    { id: '1', description: 'Item A', qty: 2, price: 25000 },
    { id: '2', description: 'Item B', qty: 1, price: 50000 },
  ],
  notes: 'Terima kasih atas kunjungan Anda!',
  payerName: '',
  amountText: '',
  purpose: '',
  signerName: '',
  signerRole: '',
};

function fmt(n: number, currency: string): string {
  try { return new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n); }
  catch { return `${currency} ${n.toFixed(2)}`; }
}

export default function ReceiptPage() {
  const [d, setD] = useState<ReceiptData>(DEFAULT);
  const subtotal = useMemo(() => d.items.reduce((s, it) => s + it.qty * it.price, 0), [d.items]);
  const tax = useMemo(() => subtotal * (d.taxRate / 100), [subtotal, d.taxRate]);
  const total = subtotal + tax;

  function update<K extends keyof ReceiptData>(k: K, v: ReceiptData[K]) {
    setD((p) => ({ ...p, [k]: v }));
  }
  function updateItem(id: string, patch: Partial<Item>) {
    setD((p) => ({ ...p, items: p.items.map((it) => it.id === id ? { ...it, ...patch } : it) }));
  }
  function addItem() {
    setD((p) => ({ ...p, items: [...p.items, { id: crypto.randomUUID(), description: '', qty: 1, price: 0 }] }));
  }
  function removeItem(id: string) {
    setD((p) => ({ ...p, items: p.items.filter((it) => it.id !== id) }));
  }

  async function exportPdf() {
    const { jsPDF } = await import('jspdf');
    if (d.style === 'thermal') {
      // 80mm wide receipt
      const pdf = new jsPDF({ unit: 'mm', format: [80, 200] });
      const W = 80;
      let y = 8;

      pdf.setFontSize(11); pdf.setFont('courier', 'bold');
      pdf.text(d.businessName, W / 2, y, { align: 'center' }); y += 5;
      pdf.setFont('courier', 'normal'); pdf.setFontSize(8);
      d.businessAddress.split('\n').forEach((ln) => { pdf.text(ln, W / 2, y, { align: 'center' }); y += 3.5; });
      if (d.businessPhone) { pdf.text(d.businessPhone, W / 2, y, { align: 'center' }); y += 4; }
      pdf.text('---------------------------------', W / 2, y, { align: 'center' }); y += 4;

      pdf.text(`No: ${d.receiptNo}`, 4, y); y += 3.5;
      pdf.text(`Date: ${d.date}`, 4, y); y += 3.5;
      if (d.cashier) { pdf.text(`Cashier: ${d.cashier}`, 4, y); y += 3.5; }
      pdf.text('---------------------------------', W / 2, y, { align: 'center' }); y += 4;

      for (const it of d.items) {
        pdf.text(it.description.slice(0, 30), 4, y); y += 3.5;
        pdf.text(`${it.qty} x ${fmt(it.price, d.currency)}`, 4, y);
        pdf.text(fmt(it.qty * it.price, d.currency), W - 4, y, { align: 'right' });
        y += 4;
      }
      pdf.text('---------------------------------', W / 2, y, { align: 'center' }); y += 4;
      pdf.text('Subtotal', 4, y); pdf.text(fmt(subtotal, d.currency), W - 4, y, { align: 'right' }); y += 4;
      if (d.taxRate > 0) {
        pdf.text(`Tax (${d.taxRate}%)`, 4, y);
        pdf.text(fmt(tax, d.currency), W - 4, y, { align: 'right' }); y += 4;
      }
      pdf.setFont('courier', 'bold');
      pdf.text('TOTAL', 4, y); pdf.text(fmt(total, d.currency), W - 4, y, { align: 'right' }); y += 5;
      pdf.setFont('courier', 'normal');
      pdf.text(`Payment: ${d.paymentMethod}`, 4, y); y += 5;
      pdf.text('---------------------------------', W / 2, y, { align: 'center' }); y += 4;
      if (d.notes) {
        const lines = pdf.splitTextToSize(d.notes, W - 8);
        lines.forEach((ln: string) => { pdf.text(ln, W / 2, y, { align: 'center' }); y += 3.5; });
      }
      downloadBlob(pdf.output('blob'), `receipt-${d.receiptNo}.pdf`);
      return;
    }

    // Formal A5 receipt
    const pdf = new jsPDF({ unit: 'pt', format: 'a5' });
    const W = pdf.internal.pageSize.getWidth();
    const M = 32;
    let y = M;

    pdf.setFontSize(20); pdf.setFont('helvetica', 'bold');
    pdf.text('RECEIPT', W - M, y + 10, { align: 'right' });
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor('#666');
    pdf.text(`#${d.receiptNo}`, W - M, y + 28, { align: 'right' });

    pdf.setTextColor('#000'); pdf.setFontSize(11);
    pdf.text(d.businessName, M, y + 10);
    pdf.setFontSize(9); pdf.setTextColor('#555');
    d.businessAddress.split('\n').forEach((ln, i) => pdf.text(ln, M, y + 26 + i * 12));

    y += 80;
    pdf.setTextColor('#999'); pdf.setFontSize(9);
    pdf.text('Received from:', M, y);
    pdf.setTextColor('#000'); pdf.setFontSize(11);
    pdf.text(d.payerName || d.customer || '—', M, y + 14);

    pdf.setTextColor('#999'); pdf.setFontSize(9);
    pdf.text('Date:', W - M - 100, y);
    pdf.setTextColor('#000');
    pdf.text(d.date, W - M, y + 14, { align: 'right' });
    y += 40;

    pdf.setTextColor('#999'); pdf.text('Sum of:', M, y);
    pdf.setTextColor('#000'); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.text(fmt(total, d.currency), M, y + 18);
    if (d.amountText) {
      pdf.setFont('helvetica', 'italic'); pdf.setFontSize(10); pdf.setTextColor('#555');
      pdf.text(`(${d.amountText})`, M, y + 36);
      y += 50;
    } else {
      y += 30;
    }

    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
    pdf.setTextColor('#999'); pdf.text('For:', M, y);
    pdf.setTextColor('#000');
    const purpose = d.purpose || (d.items.length ? d.items.map((it) => `${it.description} x${it.qty}`).join(', ') : '—');
    const purposeLines = pdf.splitTextToSize(purpose, W - 2 * M);
    pdf.text(purposeLines, M, y + 14);
    y += 14 + purposeLines.length * 12 + 20;

    pdf.setTextColor('#999'); pdf.text('Payment method:', M, y);
    pdf.setTextColor('#000'); pdf.text(d.paymentMethod, M + 100, y);
    y += 50;

    // Signer
    pdf.setDrawColor('#bbb');
    pdf.line(W - M - 160, y, W - M, y);
    pdf.setFontSize(10);
    pdf.text(d.signerName || ' ', W - M - 80, y + 14, { align: 'center' });
    pdf.setFontSize(9); pdf.setTextColor('#666');
    pdf.text(d.signerRole || 'Authorized signature', W - M - 80, y + 28, { align: 'center' });

    downloadBlob(pdf.output('blob'), `receipt-${d.receiptNo}.pdf`);
  }

  return (
    <ToolLayout slug="design/receipt">
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['thermal', 'formal'] as Style[]).map((s) => (
            <Button key={s} variant={d.style === s ? 'default' : 'outline'} onClick={() => update('style', s)}>
              {s === 'thermal' ? 'Thermal (80mm)' : 'Formal (A5)'}
            </Button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
          {/* Form */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="text-sm font-medium">Business / Header</div>
                <div className="space-y-1"><Label>Business name</Label><Input value={d.businessName} onChange={(e) => update('businessName', e.target.value)} /></div>
                <div className="space-y-1"><Label>Address</Label><Textarea value={d.businessAddress} onChange={(e) => update('businessAddress', e.target.value)} rows={2} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Phone</Label><Input value={d.businessPhone} onChange={(e) => update('businessPhone', e.target.value)} /></div>
                  <div className="space-y-1"><Label>Receipt #</Label><Input value={d.receiptNo} onChange={(e) => update('receiptNo', e.target.value)} /></div>
                  <div className="space-y-1"><Label>Date</Label><Input value={d.date} onChange={(e) => update('date', e.target.value)} /></div>
                  <div className="space-y-1"><Label>Currency</Label>
                    <select value={d.currency} onChange={(e) => update('currency', e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                      {['IDR','USD','EUR','MYR','SGD'].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  {d.style === 'thermal' && (
                    <div className="space-y-1"><Label>Cashier</Label><Input value={d.cashier} onChange={(e) => update('cashier', e.target.value)} /></div>
                  )}
                  <div className="space-y-1"><Label>Payment method</Label><Input value={d.paymentMethod} onChange={(e) => update('paymentMethod', e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>

            {d.style === 'formal' && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm font-medium">Formal receipt details</div>
                  <div className="space-y-1"><Label>Received from</Label><Input value={d.payerName} onChange={(e) => update('payerName', e.target.value)} /></div>
                  <div className="space-y-1"><Label>Amount in words</Label><Input value={d.amountText} onChange={(e) => update('amountText', e.target.value)} placeholder="seventy five thousand rupiah" /></div>
                  <div className="space-y-1"><Label>For / purpose</Label><Textarea value={d.purpose} onChange={(e) => update('purpose', e.target.value)} rows={2} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label>Signer name</Label><Input value={d.signerName} onChange={(e) => update('signerName', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Signer role</Label><Input value={d.signerRole} onChange={(e) => update('signerRole', e.target.value)} /></div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Items</div>
                  <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4" /> Add</Button>
                </div>
                <div className="space-y-2">
                  {d.items.map((it) => (
                    <div key={it.id} className="grid grid-cols-[1fr_60px_90px_auto] gap-2">
                      <Input placeholder="Description" value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} />
                      <Input type="number" value={it.qty} onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) })} />
                      <Input type="number" value={it.price} onChange={(e) => updateItem(it.id, { price: Number(e.target.value) })} />
                      <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Tax %</Label><Input type="number" value={d.taxRate} onChange={(e) => update('taxRate', Number(e.target.value))} /></div>
                </div>
                <div className="space-y-1"><Label>Notes</Label><Textarea value={d.notes} onChange={(e) => update('notes', e.target.value)} rows={2} /></div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-4 lg:sticky lg:top-20 self-start">
            <Card>
              <CardContent className="p-6 bg-white text-black flex justify-center">
                {d.style === 'thermal' ? (
                  <pre className="font-mono text-xs whitespace-pre leading-5 w-[300px] border-x border-dashed px-3 py-4">
{`         ${d.businessName}
         ${d.businessAddress.split('\n').join('\n         ')}
         ${d.businessPhone || ''}
---------------------------------
No: ${d.receiptNo}
Date: ${d.date}
${d.cashier ? `Cashier: ${d.cashier}\n` : ''}---------------------------------
${d.items.map((it) => `${it.description}\n${it.qty} x ${fmt(it.price, d.currency)}${' '.repeat(Math.max(1, 25 - (`${it.qty} x ${fmt(it.price, d.currency)}`).length))}${fmt(it.qty * it.price, d.currency)}`).join('\n')}
---------------------------------
Subtotal${' '.repeat(Math.max(1, 25 - 'Subtotal'.length))}${fmt(subtotal, d.currency)}
${d.taxRate > 0 ? `Tax (${d.taxRate}%)${' '.repeat(Math.max(1, 25 - `Tax (${d.taxRate}%)`.length))}${fmt(tax, d.currency)}\n` : ''}TOTAL${' '.repeat(Math.max(1, 28 - 'TOTAL'.length))}${fmt(total, d.currency)}
Payment: ${d.paymentMethod}
---------------------------------
${d.notes ?? ''}`}
                  </pre>
                ) : (
                  <div className="w-full text-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold">{d.businessName}</div>
                        <div className="text-xs text-gray-600 whitespace-pre-line">{d.businessAddress}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">RECEIPT</div>
                        <div className="text-xs text-gray-500">#{d.receiptNo}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 text-xs gap-3">
                      <div>
                        <div className="text-gray-500">Received from:</div>
                        <div className="font-medium">{d.payerName || d.customer || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-500">Date:</div>
                        <div>{d.date}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Sum of:</div>
                      <div className="text-xl font-bold">{fmt(total, d.currency)}</div>
                      {d.amountText && <div className="text-xs italic text-gray-600">({d.amountText})</div>}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">For:</div>
                      <div className="text-sm">{d.purpose || d.items.map((it) => `${it.description} x${it.qty}`).join(', ') || '—'}</div>
                    </div>
                    <div className="text-xs"><span className="text-gray-500">Payment: </span>{d.paymentMethod}</div>
                    <div className="pt-8 text-right text-xs">
                      <div className="border-t inline-block pt-1 px-6">
                        <div className="font-medium">{d.signerName || ' '}</div>
                        <div className="text-gray-500">{d.signerRole || 'Authorized signature'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={exportPdf} size="lg"><Download /> Download PDF</Button>
              <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
