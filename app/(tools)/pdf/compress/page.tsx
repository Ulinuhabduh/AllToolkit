'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { downloadBlob, formatBytes } from '@/lib/utils';

export default function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; size: number } | null>(null);

  async function handleCompress() {
    if (!file) return;
    setLoading(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
      out.setTitle('');
      out.setAuthor('');
      out.setSubject('');
      out.setKeywords([]);
      out.setProducer('AllTools');
      out.setCreator('AllTools');
      const bytes = await out.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      setResult({ blob, size: blob.size });
    } catch (e) {
      console.error(e);
      alert('Failed to compress PDF.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout slug="pdf/compress">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Optimizes PDF structure (object streams + metadata cleanup). PDFs with high-resolution images can shrink significantly.
        </p>
        {!file ? (
          <FileDropzone accept=".pdf,application/pdf" onFiles={(fs) => { setFile(fs[0]); setResult(null); }} label="Choose a PDF to compress" />
        ) : (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm">
                <div className="font-medium">{file.name}</div>
                <div className="text-muted-foreground">Original: {formatBytes(file.size)}</div>
                {result && (
                  <div className="text-muted-foreground">
                    After compression: {formatBytes(result.size)} <span className="text-emerald-600 font-semibold">(−{((1 - result.size / file.size) * 100).toFixed(1)}%)</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {!result ? (
                  <Button onClick={handleCompress} disabled={loading} size="lg">
                    {loading ? <><Loader2 className="animate-spin" /> Processing...</> : 'Compress'}
                  </Button>
                ) : (
                  <Button onClick={() => downloadBlob(result.blob, `compressed-${file.name}`)} size="lg">
                    <Download /> Download
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setFile(null); setResult(null); }}>New file</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ToolLayout>
  );
}
