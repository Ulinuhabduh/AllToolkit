'use client';

import { useState, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Download, Loader2, ArrowUp, ArrowDown, Trash2, Plus,
  FileText, CheckCircle2, ArrowUpDown, RefreshCw
} from 'lucide-react';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { renderPageThumbnail, parseRanges, loadPdfJsDoc } from '@/lib/pdf-utils';

interface PdfFileItem {
  id: string;
  file: File;
  pageCount: number;
  thumbnail: string;
  customRange: string;
}

export default function MergePdfPage() {
  const [items, setItems] = useState<PdfFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [outputName, setOutputName] = useState('merged-document.pdf');
  const [mergedSuccess, setMergedSuccess] = useState<number | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  async function processNewFiles(newFiles: File[]) {
    const pdfFiles = newFiles.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) return;

    setLoading(true);
    setProgressMsg('Loading PDF metadata & previews...');

    const processed: PdfFileItem[] = [];
    for (const f of pdfFiles) {
      try {
        const buffer = await f.arrayBuffer();
        const doc = await loadPdfJsDoc(buffer);
        const count = doc.numPages;
        let thumb = '';
        try {
          thumb = await renderPageThumbnail(doc, 1, 140);
        } catch {
          thumb = '';
        }
        processed.push({
          id: Math.random().toString(36).substring(2, 9),
          file: f,
          pageCount: count,
          thumbnail: thumb,
          customRange: `1-${count}`,
        });
      } catch (e) {
        console.error('Failed to load PDF preview for', f.name, e);
        processed.push({
          id: Math.random().toString(36).substring(2, 9),
          file: f,
          pageCount: 1,
          thumbnail: '',
          customRange: '1',
        });
      }
    }

    setItems((prev) => [...prev, ...processed]);
    setLoading(false);
    setProgressMsg('');
    setMergedSuccess(null);
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setItems(copy);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function reverseItems() {
    setItems((prev) => [...prev].reverse());
  }

  function updateRange(id: string, range: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, customRange: range } : item))
    );
  }

  const totalCalculatedPages = items.reduce((acc, item) => {
    const ranges = parseRanges(item.customRange || `1-${item.pageCount}`, item.pageCount);
    const pages = ranges.reduce((sub, r) => sub + r.length, 0);
    return acc + (pages > 0 ? pages : item.pageCount);
  }, 0);

  async function handleMerge() {
    if (items.length < 2) return;
    setLoading(true);
    setMergedSuccess(null);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setProgressMsg(`Merging ${i + 1} of ${items.length}: ${item.file.name}...`);
        
        const bytes = await item.file.arrayBuffer();
        const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const total = srcDoc.getPageCount();

        let pageIndicesToCopy: number[] = [];
        if (item.customRange && item.customRange.trim()) {
          const parsed = parseRanges(item.customRange, total);
          pageIndicesToCopy = parsed.flat();
        }

        if (pageIndicesToCopy.length === 0) {
          pageIndicesToCopy = srcDoc.getPageIndices();
        }

        const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndicesToCopy);
        copiedPages.forEach((p) => mergedPdf.addPage(p));
      }

      setProgressMsg('Finalizing and saving merged PDF...');
      const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
      const filename = outputName.toLowerCase().endsWith('.pdf') ? outputName : `${outputName}.pdf`;
      const blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' });
      downloadBlob(blob, filename);

      setMergedSuccess(mergedBytes.byteLength);
    } catch (e) {
      console.error(e);
      alert('Failed to merge PDFs. Please make sure all files are valid and not password-protected.');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  }

  return (
    <ToolLayout slug="pdf/merge">
      <div className="space-y-6">
        {items.length === 0 ? (
          <FileDropzone
            accept=".pdf,application/pdf"
            multiple
            onFiles={processNewFiles}
            label="Choose or drop PDF files here"
            hint="Select 2 or more PDF files to combine"
          />
        ) : (
          <div className="space-y-4">
            {/* Header controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/40 rounded-xl border">
              <div className="text-sm">
                <span className="font-semibold text-foreground">{items.length}</span> files selected
                <span className="mx-2 text-muted-foreground">•</span>
                Total approx. <span className="font-semibold text-foreground">{totalCalculatedPages}</span> pages
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addInputRef.current?.click()}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" /> Add More PDFs
                </Button>
                <input
                  ref={addInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) processNewFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reverseItems}
                  disabled={loading || items.length < 2}
                  title="Reverse order"
                >
                  <ArrowUpDown className="h-4 w-4" /> Reverse
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems([])}
                  disabled={loading}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* List of files */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <Card key={item.id} className="transition-shadow hover:shadow-sm">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      {item.thumbnail ? (
                        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded border bg-white shadow-sm">
                          <img
                            src={item.thumbnail}
                            alt={`Preview of ${item.file.name}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded border bg-muted">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-medium text-sm truncate" title={item.file.name}>
                        {item.file.name}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{formatBytes(item.file.size)}</span>
                        <span>•</span>
                        <span>{item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}</span>
                      </div>
                    </div>

                    {/* Custom range input */}
                    <div className="w-full sm:w-48 space-y-1">
                      <Label className="text-xs text-muted-foreground">Pages to include</Label>
                      <Input
                        value={item.customRange}
                        onChange={(e) => updateRange(item.id, e.target.value)}
                        placeholder={`e.g. 1-${item.pageCount}`}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    {/* Order & remove actions */}
                    <div className="flex items-center gap-1 self-end sm:self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveItem(index, -1)}
                        disabled={index === 0 || loading}
                        title="Move Up"
                        className="h-8 w-8"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveItem(index, 1)}
                        disabled={index === items.length - 1 || loading}
                        title="Move Down"
                        className="h-8 w-8"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={loading}
                        title="Remove file"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Merge options & download bar */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="filename">Output File Name</Label>
                    <Input
                      id="filename"
                      value={outputName}
                      onChange={(e) => setOutputName(e.target.value)}
                      placeholder="merged-document.pdf"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleMerge}
                      disabled={items.length < 2 || loading}
                      size="lg"
                      className="w-full sm:w-auto flex-1 font-semibold"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{progressMsg || 'Merging PDFs...'}</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          <span>Merge & Download ({totalCalculatedPages} pages)</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {mergedSuccess !== null && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Successfully merged into <strong>{outputName}</strong> ({formatBytes(mergedSuccess)})! Download has started.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
