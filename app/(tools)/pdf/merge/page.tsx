'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';

export default function MergePdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    const next = [...files];
    [next[i], next[j]] = [next[j], next[i]];
    setFiles(next);
  }

  async function handleMerge() {
    if (files.length < 2) return;
    setLoading(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const out = await PDFDocument.create();
      for (const f of files) {
        const bytes = await f.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const pages = await out.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const merged = await out.save();
      downloadBlob(new Blob([merged as BlobPart], { type: 'application/pdf' }), 'merged.pdf');
    } catch (e) {
      console.error(e);
      alert('Failed to merge PDFs. Make sure all files are valid PDFs.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout slug="pdf/merge">
      <div className="space-y-6">
        <FileDropzone
          accept=".pdf,application/pdf"
          multiple
          onFiles={(fs) => setFiles([...files, ...fs])}
          label="Choose PDF files (at least 2)"
          hint="Reorder with the arrow buttons below"
        />

        {files.length > 0 && (
          <div className="rounded-lg border divide-y">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 text-sm">
                <span className="w-6 text-muted-foreground">{i + 1}.</span>
                <span className="flex-1 truncate">{f.name}</span>
                <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === files.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>Remove</Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleMerge} disabled={files.length < 2 || loading} size="lg">
            {loading ? <><Loader2 className="animate-spin" /> Merging...</> : <><Download /> Merge & Download</>}
          </Button>
          {files.length > 0 && <Button variant="outline" onClick={() => setFiles([])}>Clear</Button>}
        </div>
      </div>
    </ToolLayout>
  );
}
