'use client';

import { useState, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Download, Loader2, RotateCw, RotateCcw, Trash2, CheckSquare,
  Square, Check, Scissors, FileText, CheckCircle2, RefreshCw
} from 'lucide-react';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { loadPdfJsDoc, renderPageThumbnail, parseRanges } from '@/lib/pdf-utils';

interface PageItem {
  pageNumber: number; // 1-indexed
  thumbnail: string;
  rotation: number; // 0, 90, 180, 270
  selected: boolean;
}

export default function CutPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [mode, setMode] = useState<'delete' | 'extract'>('delete');
  const [rangeInput, setRangeInput] = useState('');
  const [outputName, setOutputName] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ size: number; pageCount: number } | null>(null);

  useEffect(() => {
    if (!file) {
      setPages([]);
      setOutputName('');
      setSuccessInfo(null);
      return;
    }

    let isMounted = true;
    (async () => {
      setLoading(true);
      setProcessingMsg('Loading document & rendering pages...');
      try {
        const baseName = file.name.replace(/\.pdf$/i, '');
        setOutputName(`${baseName}-cut.pdf`);

        const buffer = await file.arrayBuffer();
        const doc = await loadPdfJsDoc(buffer);
        const total = doc.numPages;
        const pageItems: PageItem[] = [];

        for (let i = 1; i <= total; i++) {
          if (!isMounted) return;
          setProcessingMsg(`Rendering page preview ${i} of ${total}...`);
          let thumb = '';
          try {
            thumb = await renderPageThumbnail(doc, i, 220);
          } catch {
            thumb = '';
          }
          pageItems.push({
            pageNumber: i,
            thumbnail: thumb,
            rotation: 0,
            selected: false,
          });
        }

        if (isMounted) {
          setPages(pageItems);
        }
      } catch (e) {
        console.error(e);
        alert('Failed to load PDF pages. Please check if the file is valid.');
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

  function togglePageSelection(pageNumber: number) {
    setPages((prev) =>
      prev.map((p) => (p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p))
    );
  }

  function rotatePage(pageNumber: number, delta: number) {
    setPages((prev) =>
      prev.map((p) => {
        if (p.pageNumber !== pageNumber) return p;
        const nextRot = (p.rotation + delta + 360) % 360;
        return { ...p, rotation: nextRot };
      })
    );
  }

  function selectAll() {
    setPages((prev) => prev.map((p) => ({ ...p, selected: true })));
  }

  function deselectAll() {
    setPages((prev) => prev.map((p) => ({ ...p, selected: false })));
  }

  function invertSelection() {
    setPages((prev) => prev.map((p) => ({ ...p, selected: !p.selected })));
  }

  function selectOdd() {
    setPages((prev) => prev.map((p) => ({ ...p, selected: p.pageNumber % 2 === 1 })));
  }

  function selectEven() {
    setPages((prev) => prev.map((p) => ({ ...p, selected: p.pageNumber % 2 === 0 })));
  }

  function applyRangeSelection() {
    if (!rangeInput.trim() || pages.length === 0) return;
    const ranges = parseRanges(rangeInput, pages.length);
    const selectedIndices = new Set(ranges.flat());
    setPages((prev) =>
      prev.map((p, idx) => ({
        ...p,
        selected: selectedIndices.has(idx),
      }))
    );
  }

  // Determine which pages will be in the final output
  const outputPages = pages.filter((p) => (mode === 'delete' ? !p.selected : p.selected));
  const selectedCount = pages.filter((p) => p.selected).length;

  async function handleExport() {
    if (!file || outputPages.length === 0) return;
    setLoading(true);
    setProcessingMsg('Creating cut PDF document...');
    setSuccessInfo(null);

    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const srcBytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();

      for (const pageItem of outputPages) {
        const pageIdx = pageItem.pageNumber - 1;
        const [copiedPage] = await outDoc.copyPages(srcDoc, [pageIdx]);
        
        if (pageItem.rotation !== 0) {
          const currentRot = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((currentRot + pageItem.rotation) % 360));
        }

        outDoc.addPage(copiedPage);
      }

      const outBytes = await outDoc.save({ useObjectStreams: true });
      const filename = outputName.toLowerCase().endsWith('.pdf') ? outputName : `${outputName}.pdf`;
      const blob = new Blob([outBytes as BlobPart], { type: 'application/pdf' });
      downloadBlob(blob, filename);

      setSuccessInfo({
        size: outBytes.byteLength,
        pageCount: outputPages.length,
      });
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
      setProcessingMsg('');
    }
  }

  return (
    <ToolLayout slug="pdf/cut">
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            accept=".pdf,application/pdf"
            onFiles={(fs) => setFile(fs[0])}
            label="Choose a PDF file to cut / delete pages"
            hint="Click or drag a PDF file to view and remove pages"
          />
        ) : (
          <div className="space-y-6">
            {/* Header Toolbar */}
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-base truncate max-w-md">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(file.size)} • {pages.length} total pages
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setFile(null)} disabled={loading}>
                    <RefreshCw className="h-4 w-4" /> Change File
                  </Button>
                </div>

                {/* Mode Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action Mode</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={mode === 'delete' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMode('delete')}
                        className="gap-1.5"
                      >
                        <Trash2 className="h-4 w-4" /> Delete Selected ({selectedCount})
                      </Button>
                      <Button
                        type="button"
                        variant={mode === 'extract' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMode('extract')}
                        className="gap-1.5"
                      >
                        <Scissors className="h-4 w-4" /> Extract / Keep Selected ({selectedCount})
                      </Button>
                    </div>
                  </div>

                  {/* Range selection input */}
                  <div className="flex items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Select by Page Range</Label>
                      <Input
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        placeholder="e.g. 1-3, 5, 8-10"
                        className="h-8 text-xs font-mono w-44"
                      />
                    </div>
                    <Button variant="secondary" size="sm" onClick={applyRangeSelection} className="h-8 text-xs">
                      Apply
                    </Button>
                  </div>
                </div>

                {/* Quick Selection Shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 text-xs">
                  <span className="text-muted-foreground mr-1">Quick Select:</span>
                  <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs px-2">
                    All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll} className="h-7 text-xs px-2">
                    None
                  </Button>
                  <Button variant="ghost" size="sm" onClick={invertSelection} className="h-7 text-xs px-2">
                    Invert
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectOdd} className="h-7 text-xs px-2">
                    Odd Pages
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectEven} className="h-7 text-xs px-2">
                    Even Pages
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Page Grid */}
            {loading && pages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3 bg-muted/20 rounded-xl border border-dashed">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">{processingMsg}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Click a page to select / deselect</span>
                  <span>
                    Output will have <strong className="text-foreground">{outputPages.length}</strong> pages
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {pages.map((p) => {
                    const willBeIncluded = mode === 'delete' ? !p.selected : p.selected;
                    return (
                      <div
                        key={p.pageNumber}
                        onClick={() => togglePageSelection(p.pageNumber)}
                        className={`group relative flex flex-col rounded-xl border-2 overflow-hidden bg-card cursor-pointer transition-all duration-150 select-none shadow-sm ${
                          p.selected
                            ? mode === 'delete'
                              ? 'border-destructive ring-2 ring-destructive/20 bg-destructive/5'
                              : 'border-primary ring-2 ring-primary/20 bg-primary/5'
                            : 'border-border hover:border-foreground/40 hover:shadow'
                        } ${!willBeIncluded ? 'opacity-40 grayscale' : ''}`}
                      >
                        {/* Top bar with page number & checkbox */}
                        <div className="flex items-center justify-between p-2 text-xs bg-muted/60 border-b">
                          <span className="font-semibold">Page {p.pageNumber}</span>
                          <div className="flex items-center gap-1">
                            {p.selected ? (
                              <Badge
                                variant={mode === 'delete' ? 'destructive' : 'default'}
                                className="h-5 px-1.5 text-[10px]"
                              >
                                {mode === 'delete' ? 'Cut' : 'Keep'}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                {mode === 'delete' ? 'Keep' : 'Skip'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Thumbnail */}
                        <div className="p-3 flex items-center justify-center bg-white dark:bg-zinc-950 aspect-[3/4] overflow-hidden">
                          {p.thumbnail ? (
                            <img
                              src={p.thumbnail}
                              alt={`Page ${p.pageNumber}`}
                              style={{ transform: `rotate(${p.rotation}deg)` }}
                              className="max-h-full max-w-full object-contain rounded shadow-xs transition-transform duration-200"
                            />
                          ) : (
                            <FileText className="h-10 w-10 text-muted-foreground" />
                          )}
                        </div>

                        {/* Quick rotate & delete tools */}
                        <div
                          className="flex items-center justify-around p-1.5 bg-muted/40 border-t opacity-80 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Rotate Left"
                            onClick={() => rotatePage(p.pageNumber, -90)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Rotate Right"
                            onClick={() => rotatePage(p.pageNumber, 90)}
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${
                              p.selected ? 'text-destructive hover:bg-destructive/10' : 'text-muted-foreground'
                            }`}
                            title={p.selected ? 'Deselect' : 'Select to cut'}
                            onClick={() => togglePageSelection(p.pageNumber)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Export Bar */}
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-background to-primary/5">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="outputFileName">Output File Name</Label>
                    <Input
                      id="outputFileName"
                      value={outputName}
                      onChange={(e) => setOutputName(e.target.value)}
                      placeholder="output-cut.pdf"
                    />
                  </div>

                  <Button
                    onClick={handleExport}
                    disabled={loading || outputPages.length === 0}
                    size="lg"
                    className="w-full font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{processingMsg || 'Processing PDF...'}</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>
                          {mode === 'delete' ? 'Cut & Download' : 'Extract & Download'} ({outputPages.length}{' '}
                          {outputPages.length === 1 ? 'page' : 'pages'})
                        </span>
                      </>
                    )}
                  </Button>
                </div>

                {outputPages.length === 0 && (
                  <p className="text-xs text-destructive font-medium">
                    No pages remaining in output. Please deselect some pages or adjust mode.
                  </p>
                )}

                {successInfo && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Generated PDF with <strong>{successInfo.pageCount} pages</strong> (
                      {formatBytes(successInfo.size)})! File downloaded.
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
