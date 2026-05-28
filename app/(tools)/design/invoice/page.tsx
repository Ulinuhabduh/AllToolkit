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

interface LineItem {
  id: string;
  description: string;
  qty: number;
  price: number;
}

interface InvoiceData {
  // From
  fromName: string;
  fromAddress: string;
  fromEmail: string;
  fromPhone: string;
  // To
  toName: string;
  toAddress: string;
  toEmail: string;
  // Meta
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRate: number;
  discount: number;
  notes: string;
  paymentTerms: string;
  logoDataUrl: string | null;
  primary: string;
  items: LineItem[];
}

const DEFAULT: InvoiceData = {
  fromName: 'Acme Studio',
  fromAddress: 'Jl. Sudirman 1, Jakarta 10110\nIndonesia',
  fromEmail: 'hello@acme.studio',
  fromPhone: '+62 21 555 0123',
  toName: 'Client Name',
  toAddress: 'Client Address',
  toEmail: 'client@example.com',
  invoiceNo: `INV-${new Date().getFullYear()}-001`,
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  currency: 'IDR',
  taxRate: 11,
  discount: 0,
  notes: 'Thank you for your business!',
  paymentTerms: 'Bank Transfer: BCA 1234567890 a.n. Acme Studio',
  logoDataUrl: null,
  primary: '#6366F1',
  items: [
    { id: '1', description: 'Service or product', qty: 1, price: 1000000 },
  ],
};

function formatMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export default function InvoicePage() {
  const [d, setD] = useState<InvoiceData>(DEFAULT);

  const subtotal = useMemo(() => d.items.reduce((s, it) => s + it.qty * it.price, 0), [d.items]);
  const discountAmt = useMemo(() => subtotal * (d.discount / 100), [subtotal, d.discount]);
  const taxBase = subtotal - discountAmt;
  const taxAmt = useMemo(() => taxBase * (d.taxRate / 100), [taxBase, d.taxRate]);
  const total = taxBase + taxAmt;

  function update<K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) {
    setD((p) => ({ ...p, [key]: value }));
  }
  function updateItem(id: string, patch: Partial<LineItem>) {
    setD((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  }
  function addItem() {
    setD((p) => ({ ...p, items: [...p.items, { id: crypto.randomUUID(), description: '', qty: 1, price: 0 }] }));
  }
  function removeItem(id: string) {
    setD((p) => ({ ...p, items: p.items.filter((it) => it.id !== id) }));
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
    const M = 40;
    let y = M;

    // Logo
    if (d.logoDataUrl) {
      try { pdf.addImage(d.logoDataUrl, 'PNG', M, y, 80, 80); } catch {}
    }

    // Header: INVOICE
    pdf.setFontSize(28);
    pdf.setTextColor(d.primary);
    pdf.text('INVOICE', W - M, y + 24, { align: 'right' });
    pdf.setTextColor('#666');
    pdf.setFontSize(10);
    pdf.text(`#${d.invoiceNo}`, W - M, y + 44, { align: 'right' });

    y += 110;

    // From / To
    pdf.setTextColor('#999');
    pdf.setFontSize(9);
    pdf.text('FROM', M, y);
    pdf.text('BILL TO', W / 2, y);
    y += 14;
    pdf.setTextColor('#000');
    pdf.setFontSize(11);
    pdf.text(d.fromName, M, y);
    pdf.text(d.toName, W / 2, y);
    y += 14;
    pdf.setFontSize(9);
    pdf.setTextColor('#555');
    const fromLines = d.fromAddress.split('\n');
    const toLines = d.toAddress.split('\n');
    const linesMax = Math.max(fromLines.length, toLines.length);
    for (let i = 0; i < linesMax; i++) {
      if (fromLines[i]) pdf.text(fromLines[i], M, y + i * 12);
      if (toLines[i]) pdf.text(toLines[i], W / 2, y + i * 12);
    }
    y += linesMax * 12 + 6;
    if (d.fromEmail) pdf.text(d.fromEmail, M, y);
    if (d.toEmail) pdf.text(d.toEmail, W / 2, y);
    y += 12;
    if (d.fromPhone) pdf.text(d.fromPhone, M, y);
    y += 30;

    // Dates
    pdf.setTextColor('#999');
    pdf.text('Issue date:', W - M - 140, y);
    pdf.text('Due date:', W - M - 140, y + 14);
    pdf.setTextColor('#000');
    pdf.text(d.issueDate, W - M, y, { align: 'right' });
    pdf.text(d.dueDate, W - M, y + 14, { align: 'right' });
    y += 40;

    // Table header
    pdf.setFillColor(d.primary);
    pdf.rect(M, y, W - 2 * M, 28, 'F');
    pdf.setTextColor('#fff');
    pdf.setFontSize(10);
    pdf.text('DESCRIPTION', M + 10, y + 18);
    pdf.text('QTY', W - M - 220, y + 18, { align: 'right' });
    pdf.text('PRICE', W - M - 120, y + 18, { align: 'right' });
    pdf.text('AMOUNT', W - M - 10, y + 18, { align: 'right' });
    y += 28;

    // Table rows
    pdf.setTextColor('#000');
    pdf.setFontSize(10);
    for (const it of d.items) {
      pdf.setDrawColor('#eee');
      pdf.line(M, y + 22, W - M, y + 22);
      pdf.text(it.description || '—', M + 10, y + 16, { maxWidth: W - 2 * M - 250 });
      pdf.text(String(it.qty), W - M - 220, y + 16, { align: 'right' });
      pdf.text(formatMoney(it.price, d.currency), W - M - 120, y + 16, { align: 'right' });
      pdf.text(formatMoney(it.qty * it.price, d.currency), W - M - 10, y + 16, { align: 'right' });
      y += 24;
    }

    y += 14;
    // Totals
    const tx = W - M - 200;
    pdf.setTextColor('#555');
    pdf.text('Subtotal', tx, y);
    pdf.setTextColor('#000');
    pdf.text(formatMoney(subtotal, d.currency), W - M, y, { align: 'right' });
    y += 16;
    if (d.discount > 0) {
      pdf.setTextColor('#555');
      pdf.text(`Discount (${d.discount}%)`, tx, y);
      pdf.setTextColor('#000');
      pdf.text(`-${formatMoney(discountAmt, d.currency)}`, W - M, y, { align: 'right' });
      y += 16;
    }
    if (d.taxRate > 0) {
      pdf.setTextColor('#555');
      pdf.text(`Tax (${d.taxRate}%)`, tx, y);
      pdf.setTextColor('#000');
      pdf.text(formatMoney(taxAmt, d.currency), W - M, y, { align: 'right' });
      y += 16;
    }
    pdf.setFillColor(d.primary);
    pdf.rect(tx - 10, y, W - M - tx + 10, 32, 'F');
    pdf.setTextColor('#fff');
    pdf.setFontSize(12);
    pdf.text('TOTAL', tx, y + 20);
    pdf.setFontSize(14);
    pdf.text(formatMoney(total, d.currency), W - M, y + 21, { align: 'right' });
    y += 50;

    // Notes & terms
    pdf.setFontSize(9);
    if (d.paymentTerms) {
      pdf.setTextColor('#999');
      pdf.text('PAYMENT TERMS', M, y);
      pdf.setTextColor('#000');
      const lines = pdf.splitTextToSize(d.paymentTerms, W - 2 * M);
      pdf.text(lines, M, y + 14);
      y += 14 + lines.length * 11;
    }
    if (d.notes) {
      y += 8;
      pdf.setTextColor('#999');
      pdf.text('NOTES', M, y);
      pdf.setTextColor('#000');
      const lines = pdf.splitTextToSize(d.notes, W - 2 * M);
      pdf.text(lines, M, y + 14);
    }

    downloadBlob(pdf.output('blob'), `${d.invoiceNo}.pdf`);
  }

  return (
    <ToolLayout slug="design/invoice">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        {/* ─── Form ─── */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Your business</div>
              <div className="space-y-2">
                <div className="space-y-1"><Label>Logo</Label><Input type="file" accept="image/*" onChange={handleLogo} /></div>
                <div className="space-y-1"><Label>Name</Label><Input value={d.fromName} onChange={(e) => update('fromName', e.target.value)} /></div>
                <div className="space-y-1"><Label>Address</Label><Textarea value={d.fromAddress} onChange={(e) => update('fromAddress', e.target.value)} rows={2} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Email</Label><Input value={d.fromEmail} onChange={(e) => update('fromEmail', e.target.value)} /></div>
                  <div className="space-y-1"><Label>Phone</Label><Input value={d.fromPhone} onChange={(e) => update('fromPhone', e.target.value)} /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Bill to</div>
              <div className="space-y-1"><Label>Client name</Label><Input value={d.toName} onChange={(e) => update('toName', e.target.value)} /></div>
              <div className="space-y-1"><Label>Address</Label><Textarea value={d.toAddress} onChange={(e) => update('toAddress', e.target.value)} rows={2} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={d.toEmail} onChange={(e) => update('toEmail', e.target.value)} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Invoice details</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Invoice #</Label><Input value={d.invoiceNo} onChange={(e) => update('invoiceNo', e.target.value)} /></div>
                <div className="space-y-1"><Label>Currency</Label>
                  <select value={d.currency} onChange={(e) => update('currency', e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                    {['IDR','USD','EUR','GBP','JPY','SGD','AUD','MYR'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Issue date</Label><Input type="date" value={d.issueDate} onChange={(e) => update('issueDate', e.target.value)} /></div>
                <div className="space-y-1"><Label>Due date</Label><Input type="date" value={d.dueDate} onChange={(e) => update('dueDate', e.target.value)} /></div>
                <div className="space-y-1"><Label>Tax %</Label><Input type="number" value={d.taxRate} onChange={(e) => update('taxRate', Number(e.target.value))} /></div>
                <div className="space-y-1"><Label>Discount %</Label><Input type="number" value={d.discount} onChange={(e) => update('discount', Number(e.target.value))} /></div>
              </div>
              <div className="space-y-1"><Label>Brand color</Label><Input type="color" value={d.primary} onChange={(e) => update('primary', e.target.value.toUpperCase())} className="h-10 w-20 p-1" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Items</div>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4" /> Add item</Button>
              </div>
              <div className="space-y-2">
                {d.items.map((it) => (
                  <div key={it.id} className="grid grid-cols-[1fr_70px_110px_auto] gap-2">
                    <Input placeholder="Description" value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} />
                    <Input type="number" placeholder="Qty" value={it.qty} onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) })} />
                    <Input type="number" placeholder="Price" value={it.price} onChange={(e) => updateItem(it.id, { price: Number(e.target.value) })} />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1"><Label>Payment terms</Label><Textarea value={d.paymentTerms} onChange={(e) => update('paymentTerms', e.target.value)} rows={2} /></div>
              <div className="space-y-1"><Label>Notes</Label><Textarea value={d.notes} onChange={(e) => update('notes', e.target.value)} rows={2} /></div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Preview ─── */}
        <div className="space-y-4 lg:sticky lg:top-20 self-start">
          <Card>
            <CardContent className="p-6 bg-white text-black text-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  {d.logoDataUrl && <img src={d.logoDataUrl} alt="logo" className="h-14 mb-2 object-contain" />}
                  <div className="font-bold text-base">{d.fromName}</div>
                  <div className="text-xs whitespace-pre-line text-gray-600">{d.fromAddress}</div>
                  <div className="text-xs text-gray-600">{d.fromEmail} • {d.fromPhone}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: d.primary }}>INVOICE</div>
                  <div className="text-xs text-gray-500">#{d.invoiceNo}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="text-[10px] uppercase text-gray-500">Bill to</div>
                  <div className="font-medium">{d.toName}</div>
                  <div className="text-xs whitespace-pre-line text-gray-600">{d.toAddress}</div>
                  <div className="text-xs text-gray-600">{d.toEmail}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs"><span className="text-gray-500">Issue date: </span>{d.issueDate}</div>
                  <div className="text-xs"><span className="text-gray-500">Due date: </span>{d.dueDate}</div>
                </div>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: d.primary, color: '#fff' }}>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2 w-12">Qty</th>
                    <th className="text-right p-2 w-24">Price</th>
                    <th className="text-right p-2 w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {d.items.map((it) => (
                    <tr key={it.id} className="border-b">
                      <td className="p-2">{it.description || '—'}</td>
                      <td className="p-2 text-right">{it.qty}</td>
                      <td className="p-2 text-right">{formatMoney(it.price, d.currency)}</td>
                      <td className="p-2 text-right">{formatMoney(it.qty * it.price, d.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 text-xs space-y-1">
                  <Row label="Subtotal" value={formatMoney(subtotal, d.currency)} />
                  {d.discount > 0 && <Row label={`Discount (${d.discount}%)`} value={`-${formatMoney(discountAmt, d.currency)}`} />}
                  {d.taxRate > 0 && <Row label={`Tax (${d.taxRate}%)`} value={formatMoney(taxAmt, d.currency)} />}
                  <div className="flex justify-between pt-2 mt-1 px-2 py-1 text-white font-bold" style={{ background: d.primary }}>
                    <span>TOTAL</span><span>{formatMoney(total, d.currency)}</span>
                  </div>
                </div>
              </div>

              {d.paymentTerms && (
                <div className="pt-3 text-xs">
                  <div className="text-[10px] uppercase text-gray-500">Payment terms</div>
                  <div className="whitespace-pre-line">{d.paymentTerms}</div>
                </div>
              )}
              {d.notes && (
                <div className="text-xs">
                  <div className="text-[10px] uppercase text-gray-500">Notes</div>
                  <div className="whitespace-pre-line">{d.notes}</div>
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
    </ToolLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-gray-600">{label}</span><span>{value}</span></div>;
}
