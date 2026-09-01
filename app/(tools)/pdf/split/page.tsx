'use client';

import { useEffect, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Download, Loader2, Scissors, Plus, Trash2, Layers,
  FileText, CheckCircle2, RefreshCw, FileArchive, Check
} from 'lucide-react';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { loadPdfJsDoc, renderPageThumbnail, parseRanges } from '@/lib/pdf-utils';

type SplitMode = 'ranges' | 'fixed' | 'extract-all' | 'visual';

interface PagePreview {
  pageNumber: number;
  thumbnail: string;
}

interface CustomRangeItem {
  id: string;
  name: string;
  rangeText: string;
}

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PagePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('ranges');

  // Mode 1: Custom Ranges
  const [customRanges, setCustomRanges] = useState<CustomRangeItem[]>([
    { id: '1', name: 'Part 1', rangeText: '1' },
  ]);
  const [mergeRangesToOne, setMergeRangesToOne] = useState(false);

  // Mode 2: Fixed chunk size (split every N pages)
  const [everyNPages, setEveryNPages] = useState<number>(1);

  // Mode 4: Visual Selection
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());

  // Result info
  const [outputBaseName, setOutputBaseName] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPageCount(0);
      setPreviews([]);
      setSelectedPages(new Set());
      setSuccessMsg(null);
      return;
    }

    let isMounted = true;
    (async () => {
      setLoading(true);
      setProcessingMsg('Analyzing PDF document...');
      try {
        const baseName = file.name.replace(/\.pdf$/i, '');
        setOutputBaseName(baseName);

        const bytes = await file.arrayBuffer();
        const doc = await loadPdfJsDoc(bytes);
        const count = doc.numPages;

        if (isMounted) {
          setPageCount(count);
          setCustomRanges([
            { id: '1', name: 'Part 1', rangeText: `1-${Math.min(count, Math.ceil(count / 2))}` },
            ...(count > 1
              ? [{ id: '2', name: 'Part 2', rangeText: `${Math.min(count, Math.ceil(count / 2)) + 1}-${count}` }]
              : []),
          ]);
        }

        // Render thumbnails in background
        const thumbs: PagePreview[] = [];
        for (let i = 1; i <= count; i++) {
          if (!isMounted) return;
          setProcessingMsg(`Rendering page preview ${i} of ${count}...`);
          let thumb = '';
          try {
            thumb = await renderPageThumbnail(doc, i, 160);
          } catch {
            thumb = '';
          }
          thumbs.push({ pageNumber: i, thumbnail: thumb });
        }

        if (isMounted) {
          setPreviews(thumbs);
        }
      } catch (e) {
        console.error(e);
        alert('Failed to load PDF. Please make sure the file is valid.');
      } finally {
        if (isMounted) {
          setLoading(false);
          setProcessingMsg('');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [file]);

  function addCustomRange() {
    const nextIndex = customRanges.length + 1;
    setCustomRanges((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), name: `Part ${nextIndex}`, rangeText: `1-${pageCount}` },
    ]);
  }

  function removeCustomRange(id: string) {
    if (customRanges.length <= 1) return;
    setCustomRanges((prev) => prev.filter((r) => r.id !== id));
  }

  function updateCustomRange(id: string, field: 'name' | 'rangeText', value: string) {
    setCustomRanges((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function toggleVisualPage(pageNum: number) {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
  }

  // Calculate planned files based on current split mode
  const plannedFiles: { filename: string; pages: number[] }[] = [];
  const base = outputBaseName.trim() || 'document';

  if (splitMode === 'ranges') {
    customRanges.forEach((cr) => {
      const parsed = parseRanges(cr.rangeText, pageCount);
      const flat = parsed.flat();
      if (flat.length > 0) {
        const cleanName = cr.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'part';
        plannedFiles.push({
          filename: `${base}-${cleanName}.pdf`,
          pages: flat,
        });
      }
    });
  } else if (splitMode === 'fixed') {
    const chunkSize = Math.max(1, everyNPages);
    let currentPart = 1;
    for (let i = 0; i < pageCount; i += chunkSize) {
      const indices: number[] = [];
      for (let j = i; j < Math.min(i + chunkSize, pageCount); j++) {
        indices.push(j);
      }
      plannedFiles.push({
        filename: `${base}-part-${currentPart++}.pdf`,
        pages: indices,
      });
    }
  } else if (splitMode === 'extract-all') {
    for (let i = 0; i < pageCount; i++) {
      plannedFiles.push({
        filename: `${base}-page-${i + 1}.pdf`,
        pages: [i],
      });
    }
  } else if (splitMode === 'visual') {
    const indices = Array.from(selectedPages)
      .sort((a, b) => a - b)
      .map((p) => p - 1);
    if (indices.length > 0) {
      plannedFiles.push({
        filename: `${base}-selected.pdf`,
        pages: indices,
      });
    }
  }

  async function handleSplit() {
    if (!file || plannedFiles.length === 0) return;
    setLoading(true);
    setSuccessMsg(null);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const srcDoc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });

      // If user chose to merge custom ranges into a single PDF
      if (splitMode === 'ranges' && mergeRangesToOne && plannedFiles.length > 0) {
        setProcessingMsg('Combining ranges into a single PDF...');
        const outDoc = await PDFDocument.create();
        const allIndices = plannedFiles.flatMap((f) => f.pages);
        const copied = await outDoc.copyPages(srcDoc, allIndices);
        copied.forEach((p) => outDoc.addPage(p));

        const bytes = await outDoc.save({ useObjectStreams: true });
        const finalName = `${base}-split.pdf`;
        downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), finalName);
        setSuccessMsg(`Successfully created ${finalName} (${copied.length} pages)`);
        return;
      }

      // If exactly 1 file is produced
      if (plannedFiles.length === 1) {
        setProcessingMsg('Generating split PDF...');
        const item = plannedFiles[0];
        const outDoc = await PDFDocument.create();
        const copied = await outDoc.copyPages(srcDoc, item.pages);
        copied.forEach((p) => outDoc.addPage(p));

        const bytes = await outDoc.save({ useObjectStreams: true });
        downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), item.filename);
        setSuccessMsg(`Successfully created ${item.filename} (${copied.length} pages)`);
        return;
      }

      // Multiple files -> Bundle into ZIP
      setProcessingMsg(`Generating ${plannedFiles.length} PDF files and packaging ZIP...`);
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (let i = 0; i < plannedFiles.length; i++) {
        const item = plannedFiles[i];
        setProcessingMsg(`Processing file ${i + 1} of ${plannedFiles.length}: ${item.filename}...`);
        const outDoc = await PDFDocument.create();
        const copied = await outDoc.copyPages(srcDoc, item.pages);
        copied.forEach((p) => outDoc.addPage(p));
        const bytes = await outDoc.save({ useObjectStreams: true });
        zip.file(item.filename, bytes);
      }

      setProcessingMsg('Compressing ZIP archive...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = `${base}-split.zip`;
      downloadBlob(zipBlob, zipName);
      setSuccessMsg(`Successfully created ${zipName} containing ${plannedFiles.length} PDF files!`);
    } catch (e) {
      console.error(e);
      alert('Failed to split PDF. Please check your page range settings.');
    } finally {
      setLoading(false);
      setProcessingMsg('');
    }
  }

  return (
    <ToolLayout slug="pdf/split">
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            accept=".pdf,application/pdf"
            onFiles={(fs) => setFile(fs[0])}
            label="Choose a PDF file to split"
            hint="Split PDF by ranges, fixed chunks, visual selection, or extract all pages"
          />
        ) : (
          <div className="space-y-6">
            {/* Header info */}
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-base truncate max-w-md">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(file.size)} • {pageCount} pages
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setFile(null)} disabled={loading}>
                    <RefreshCw className="h-4 w-4" /> Change PDF
                  </Button>
                </div>

                {/* Split Modes Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Split Mode
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      type="button"
                      variant={splitMode === 'ranges' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSplitMode('ranges')}
                      className="justify-center"
                    >
                      <Scissors className="h-4 w-4 mr-1" /> Custom Ranges
                    </Button>
                    <Button
                      type="button"
                      variant={splitMode === 'fixed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSplitMode('fixed')}
                      className="justify-center"
                    >
                      <Layers className="h-4 w-4 mr-1" /> Every N Pages
                    </Button>
                    <Button
                      type="button"
                      variant={splitMode === 'extract-all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSplitMode('extract-all')}
                      className="justify-center"
                    >
                      <FileArchive className="h-4 w-4 mr-1" /> All Single Pages
                    </Button>
                    <Button
                      type="button"
                      variant={splitMode === 'visual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSplitMode('visual')}
                      className="justify-center"
                    >
                      <Check className="h-4 w-4 mr-1" /> Visual Selection
                    </Button>
                  </div>
                </div>

                {/* Mode Options */}
                {splitMode === 'ranges' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Define Page Ranges</Label>
                      <Button variant="outline" size="sm" onClick={addCustomRange} className="h-8 text-xs">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Range
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {customRanges.map((cr, idx) => (
                        <div key={cr.id} className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border">
                          <span className="text-xs font-mono text-muted-foreground w-6 text-center">{idx + 1}.</span>
                          <Input
                            value={cr.name}
                            onChange={(e) => updateCustomRange(cr.id, 'name', e.target.value)}
                            placeholder="Part name"
                            className="h-8 text-xs w-36"
                          />
                          <Input
                            value={cr.rangeText}
                            onChange={(e) => updateCustomRange(cr.id, 'rangeText', e.target.value)}
                            placeholder={`e.g. 1-${pageCount}`}
                            className="h-8 text-xs font-mono flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCustomRange(cr.id)}
                            disabled={customRanges.length <= 1}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <input
                        type="checkbox"
                        id="mergeOption"
                        checked={mergeRangesToOne}
                        onChange={(e) => setMergeRangesToOne(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="mergeOption" className="cursor-pointer text-muted-foreground">
                        Merge all defined ranges into a single output PDF (instead of separate files)
                      </label>
                    </div>
                  </div>
                )}

                {splitMode === 'fixed' && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-sm font-medium">Split every how many pages?</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min="1"
                        max={pageCount}
                        value={everyNPages}
                        onChange={(e) => setEveryNPages(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-32 h-9 text-sm"
                      />
                      <span className="text-sm text-muted-foreground">
                        Will generate <strong>{Math.ceil(pageCount / Math.max(1, everyNPages))}</strong> PDF files.
                      </span>
                    </div>
                  </div>
                )}

                {splitMode === 'extract-all' && (
                  <div className="pt-2 text-sm text-muted-foreground">
                    Extracts all <strong className="text-foreground">{pageCount}</strong> pages into individual 1-page PDF files and packages them into a ZIP archive.
                  </div>
                )}

                {splitMode === 'visual' && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Click pages below to select which ones to extract into a new PDF:
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))}
                          className="h-6 text-xs px-2"
                        >
                          Select All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPages(new Set())}
                          className="h-6 text-xs px-2"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Page Previews Gallery */}
            {previews.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Document Pages ({pageCount})
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                  {previews.map((p) => {
                    const isSelected = selectedPages.has(p.pageNumber);
                    return (
                      <div
                        key={p.pageNumber}
                        onClick={() => {
                          if (splitMode === 'visual') toggleVisualPage(p.pageNumber);
                        }}
                        className={`group relative flex flex-col rounded-lg border overflow-hidden bg-card transition-all ${
                          splitMode === 'visual' ? 'cursor-pointer' : ''
                        } ${
                          splitMode === 'visual' && isSelected
                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                            : 'border-border hover:border-foreground/30'
                        }`}
                      >
                        <div className="p-2 flex items-center justify-center bg-white dark:bg-zinc-950 aspect-[3/4] overflow-hidden">
                          {p.thumbnail ? (
                            <img
                              src={p.thumbnail}
                              alt={`Page ${p.pageNumber}`}
                              className="max-h-full max-w-full object-contain rounded shadow-xs"
                            />
                          ) : (
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="p-1 text-[11px] font-mono text-center bg-muted/60 border-t flex items-center justify-center gap-1">
                          {splitMode === 'visual' && (
                            <span
                              className={`h-2 w-2 rounded-full ${isSelected ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                            />
                          )}
                          <span>p.{p.pageNumber}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="baseName">Output Base Name</Label>
                    <Input
                      id="baseName"
                      value={outputBaseName}
                      onChange={(e) => setOutputBaseName(e.target.value)}
                      placeholder="document"
                    />
                  </div>

                  <Button
                    onClick={handleSplit}
                    disabled={loading || plannedFiles.length === 0}
                    size="lg"
                    className="w-full font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{processingMsg || 'Splitting PDF...'}</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>
                          {splitMode === 'ranges' && mergeRangesToOne
                            ? 'Split & Merge to 1 PDF'
                            : plannedFiles.length === 1
                            ? 'Split & Download (1 PDF)'
                            : `Split into ${plannedFiles.length} PDFs (.ZIP)`}
                        </span>
                      </>
                    )}
                  </Button>
                </div>

                {successMsg && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{successMsg}</span>
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
