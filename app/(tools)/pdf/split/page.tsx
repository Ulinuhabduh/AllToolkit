'use client';

import { useEffect, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

function parseRanges(input: string, total: number): number[][] {
  const result: number[][] = [];
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (p.includes('-')) {
      const [a, b] = p.split('-').map((n) => parseInt(n.trim()));
      if (Number.isFinite(a) && Number.isFinite(b) && a >= 1 && b <= total && a <= b) {
        result.push(Array.from({ length: b - a + 1 }, (_, i) => a + i - 1));
      }
    } else {
      const n = parseInt(p);
      if (Number.isFinite(n) && n >= 1 && n <= total) result.push([n - 1]);
    }
  }
  return result;
}

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [ranges, setRanges] = useState('1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) return;
    (async () => {
      const { PDFDocument } = await import('pdf-lib');
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setPageCount(doc.getPageCount());
      setRanges(`1-${doc.getPageCount()}`);
    })();
  }, [file]);

  async function handleSplit() {
    if (!file) return;
    setLoading(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const JSZip = (await import('jszip')).default;
      const src = await PDFDocument.load(await file.arrayBuffer());
      const groups = parseRanges(ranges, pageCount);
      if (groups.length === 0) { alert('Invalid range format. Example: 1-3, 5, 8-10'); setLoading(false); return; }
      const baseName = file.name.replace(/\.pdf$/i, '');

      if (groups.length === 1) {
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, groups[0]);
        pages.forEach((p) => out.addPage(p));
        downloadBlob(new Blob([await out.save() as BlobPart], { type: 'application/pdf' }), `${baseName}-split.pdf`);
      } else {
        const zip = new JSZip();
        let i = 0;
        for (const g of groups) {
          const out = await PDFDocument.create();
          const pages = await out.copyPages(src, g);
          pages.forEach((p) => out.addPage(p));
          zip.file(`${baseName}-part-${++i}.pdf`, await out.save());
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, `${baseName}-split.zip`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to split PDF.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout slug="pdf/split">
      <div className="space-y-6">
        {!file ? (
          <FileDropzone accept=".pdf,application/pdf" onFiles={(fs) => setFile(fs[0])} label="Choose a PDF" />
        ) : (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="text-sm text-muted-foreground">{file.name} — {pageCount} pages</div>
              <div className="space-y-2">
                <Label>Page ranges</Label>
                <Input value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="e.g. 1-3, 5, 8-10" />
                <p className="text-xs text-muted-foreground">Each range becomes a separate PDF; if there's more than one, they're packaged into a ZIP.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSplit} disabled={loading} size="lg">
                  {loading ? <><Loader2 className="animate-spin" /> Processing...</> : <><Download /> Split & Download</>}
                </Button>
                <Button variant="outline" onClick={() => setFile(null)}>Change file</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ToolLayout>
  );
}
