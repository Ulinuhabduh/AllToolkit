'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Download, Loader2, Type, Square, Highlighter,
  RotateCw, RotateCcw, Trash2, Plus, MoveUp, MoveDown,
  ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, Stamp,
  Eraser, FileText, CheckCircle2, RefreshCw, Pen,
  Image as ImageIcon, Check, X, ShieldAlert, Sparkles
} from 'lucide-react';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { loadPdfJsDoc, renderPageToCanvas, renderPageThumbnail, hexToRgb } from '@/lib/pdf-utils';

type ActiveTool = 'select' | 'text' | 'draw' | 'highlight' | 'whiteout' | 'rect' | 'signature' | 'image' | 'stamp';

interface AnnotationElement {
  id: string;
  type: 'text' | 'draw' | 'highlight' | 'whiteout' | 'rect' | 'signature' | 'image' | 'stamp';
  pageNumber: number; // 1-indexed
  x: number; // in screen px relative to canvas
  y: number; // in screen px relative to canvas
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  fontFamily?: 'Helvetica' | 'Times' | 'Courier';
  isBold?: boolean;
  isItalic?: boolean;
  color?: string; // hex
  bgColor?: string; // hex or 'transparent'
  opacity?: number;
  borderWidth?: number;
  borderColor?: string;
  drawPoints?: { x: number; y: number }[];
  lineWidth?: number;
  imageDataUrl?: string;
  stampText?: string;
}

interface PageMeta {
  pageNumber: number; // original page index or -1 for blank
  originalIndex: number;
  rotation: number; // 0, 90, 180, 270
  thumbnail: string;
  width: number;
  height: number;
}

const PRESET_COLORS = [
  '#000000', '#2563eb', '#dc2626', '#16a34a',
  '#d97706', '#9333ea', '#ffffff'
];

const STAMPS = [
  { label: 'APPROVED', color: '#16a34a', border: '#16a34a' },
  { label: 'CONFIDENTIAL', color: '#dc2626', border: '#dc2626' },
  { label: 'DRAFT', color: '#d97706', border: '#d97706' },
  { label: 'FINAL', color: '#2563eb', border: '#2563eb' },
  { label: 'PAID', color: '#16a34a', border: '#16a34a' },
  { label: 'VOID', color: '#dc2626', border: '#dc2626' },
];

export default function EditPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [annotations, setAnnotations] = useState<AnnotationElement[]>([]);
  const [history, setHistory] = useState<AnnotationElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Tools & State
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [outputName, setOutputName] = useState<string>('');
  const [successInfo, setSuccessInfo] = useState<{ size: number } | null>(null);

  // Tool settings
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [currentBgColor, setCurrentBgColor] = useState<string>('transparent');
  const [currentFontSize, setCurrentFontSize] = useState<number>(16);
  const [currentFontFamily, setCurrentFontFamily] = useState<'Helvetica' | 'Times' | 'Courier'>('Helvetica');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [currentLineWidth, setCurrentLineWidth] = useState<number>(3);

  // Signature Modal State
  const [showSignatureModal, setShowSignatureModal] = useState<boolean>(false);
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState<string>('');
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigDrawing, setIsSigDrawing] = useState(false);

  // Global Watermark & Page numbering
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [enablePageNumbers, setEnablePageNumbers] = useState<boolean>(false);

  // DOM Refs
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isFreehandDrawing = useRef<boolean>(false);
  const currentDrawPoints = useRef<{ x: number; y: number }[]>([]);

  // Dragging / Resizing elements
  const [draggingElemId, setDraggingElemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update history
  const pushHistory = useCallback((newAnnotations: AnnotationElement[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newAnnotations];
    });
    setHistoryIndex((prev) => prev + 1);
    setAnnotations(newAnnotations);
  }, [historyIndex]);

  // Load PDF file
  useEffect(() => {
    if (!file) {
      setPdfDoc(null);
      setPages([]);
      setAnnotations([]);
      setHistory([]);
      setHistoryIndex(-1);
      setSelectedElementId(null);
      setSuccessInfo(null);
      return;
    }

    let isMounted = true;
    (async () => {
      setLoading(true);
      setProgressMsg('Loading PDF pages...');
      try {
        const baseName = file.name.replace(/\.pdf$/i, '');
        setOutputName(`${baseName}-edited.pdf`);

        const buffer = await file.arrayBuffer();
        const doc = await loadPdfJsDoc(buffer);
        if (!isMounted) return;
        setPdfDoc(doc);

        const pageMetas: PageMeta[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          setProgressMsg(`Rendering page thumbnail ${i} of ${doc.numPages}...`);
          const p = await doc.getPage(i);
          const vp = p.getViewport({ scale: 1.0 });
          let thumb = '';
          try {
            thumb = await renderPageThumbnail(doc, i, 160);
          } catch {
            thumb = '';
          }
          pageMetas.push({
            pageNumber: i,
            originalIndex: i - 1,
            rotation: 0,
            thumbnail: thumb,
            width: vp.width,
            height: vp.height,
          });
        }

        if (isMounted) {
          setPages(pageMetas);
          setCurrentPageIndex(0);
        }
      } catch (e) {
        console.error(e);
        alert('Failed to open PDF. Please make sure the file is valid.');
      } finally {
        if (isMounted) {
          setLoading(false);
          setProgressMsg('');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [file]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || pages.length === 0 || currentPageIndex < 0 || currentPageIndex >= pages.length) return;
    const pageMeta = pages[currentPageIndex];
    const canvas = pageCanvasRef.current;
    if (!canvas) return;

    let isCancelled = false;
    (async () => {
      if (pageMeta.pageNumber === -1) {
        // Blank page
        canvas.width = 595 * scale;
        canvas.height = 842 * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        try {
          const page = await pdfDoc.getPage(pageMeta.pageNumber);
          const viewport = page.getViewport({
            scale,
            rotation: pageMeta.rotation,
          });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({
              canvasContext: ctx,
              viewport,
              canvas,
            } as any).promise;
          }
        } catch (err) {
          if (!isCancelled) console.error('Error rendering page:', err);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pages, currentPageIndex, scale]);

  // Handle freehand drawing canvas
  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'draw' && activeTool !== 'highlight') return;
    isFreehandDrawing.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    currentDrawPoints.current = [{ x, y }];

    const canvas = drawOverlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = activeTool === 'highlight' ? '#fde047' : currentColor;
        ctx.globalAlpha = activeTool === 'highlight' ? 0.4 : 1.0;
        ctx.lineWidth = activeTool === 'highlight' ? 16 : currentLineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFreehandDrawing.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    currentDrawPoints.current.push({ x, y });

    const canvas = drawOverlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const handleOverlayMouseUp = () => {
    if (!isFreehandDrawing.current) return;
    isFreehandDrawing.current = false;

    if (currentDrawPoints.current.length > 1) {
      const pts = [...currentDrawPoints.current];
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const pad = 4;

      const newElem: AnnotationElement = {
        id: Math.random().toString(36).substring(2, 9),
        type: activeTool === 'highlight' ? 'highlight' : 'draw',
        pageNumber: currentPageIndex + 1,
        x: Math.max(0, minX - pad),
        y: Math.max(0, minY - pad),
        width: Math.max(20, maxX - minX + pad * 2),
        height: Math.max(20, maxY - minY + pad * 2),
        drawPoints: pts,
        color: activeTool === 'highlight' ? '#fde047' : currentColor,
        lineWidth: activeTool === 'highlight' ? 16 : currentLineWidth,
        opacity: activeTool === 'highlight' ? 0.4 : 1.0,
      };

      pushHistory([...annotations, newElem]);
    }

    currentDrawPoints.current = [];
    const canvas = drawOverlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Canvas click to place annotations (text, shapes, whiteout, stamp)
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || activeTool === 'draw' || activeTool === 'highlight') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let newElem: AnnotationElement | null = null;
    const id = Math.random().toString(36).substring(2, 9);
    const pNum = currentPageIndex + 1;

    if (activeTool === 'text') {
      newElem = {
        id,
        type: 'text',
        pageNumber: pNum,
        x,
        y,
        width: 180,
        height: 40,
        text: 'Type text here',
        fontSize: currentFontSize,
        fontFamily: currentFontFamily,
        isBold,
        isItalic,
        color: currentColor,
        bgColor: currentBgColor,
      };
    } else if (activeTool === 'whiteout') {
      newElem = {
        id,
        type: 'whiteout',
        pageNumber: pNum,
        x,
        y,
        width: 140,
        height: 30,
        color: '#ffffff',
        bgColor: '#ffffff',
        borderWidth: 0,
      };
    } else if (activeTool === 'rect') {
      newElem = {
        id,
        type: 'rect',
        pageNumber: pNum,
        x,
        y,
        width: 120,
        height: 80,
        color: currentColor,
        borderColor: currentColor,
        borderWidth: 2,
        bgColor: 'transparent',
        opacity: 1.0,
      };
    }

    if (newElem) {
      pushHistory([...annotations, newElem]);
      setSelectedElementId(newElem.id);
      setActiveTool('select');
    }
  };

  // Add Stamp
  const addStamp = (stamp: { label: string; color: string; border: string }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newElem: AnnotationElement = {
      id,
      type: 'stamp',
      pageNumber: currentPageIndex + 1,
      x: 100,
      y: 100,
      width: 160,
      height: 50,
      stampText: stamp.label,
      color: stamp.color,
      borderColor: stamp.border,
      borderWidth: 3,
      fontSize: 18,
      isBold: true,
      bgColor: 'transparent',
    };
    pushHistory([...annotations, newElem]);
    setSelectedElementId(id);
    setActiveTool('select');
  };

  // Image Upload
  const handleImageUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const id = Math.random().toString(36).substring(2, 9);
      const newElem: AnnotationElement = {
        id,
        type: 'image',
        pageNumber: currentPageIndex + 1,
        x: 80,
        y: 80,
        width: 160,
        height: 120,
        imageDataUrl: dataUrl,
      };
      pushHistory([...annotations, newElem]);
      setSelectedElementId(id);
      setActiveTool('select');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Signature creation
  const handleSaveSignature = () => {
    let dataUrl = '';
    if (signatureType === 'draw') {
      const canvas = signatureCanvasRef.current;
      if (!canvas) return;
      dataUrl = canvas.toDataURL('image/png');
    } else {
      if (!typedSignature.trim()) return;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'italic 36px "Dancing Script", cursive, "Brush Script MT", sans-serif';
        ctx.fillStyle = currentColor || '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedSignature, 200, 60);
        dataUrl = canvas.toDataURL('image/png');
      }
    }

    if (dataUrl) {
      const id = Math.random().toString(36).substring(2, 9);
      const newElem: AnnotationElement = {
        id,
        type: 'signature',
        pageNumber: currentPageIndex + 1,
        x: 100,
        y: 100,
        width: 180,
        height: 70,
        imageDataUrl: dataUrl,
      };
      pushHistory([...annotations, newElem]);
      setSelectedElementId(id);
      setShowSignatureModal(false);
      setActiveTool('select');
      setTypedSignature('');
    }
  };

  // Element dragging
  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelectedElementId(id);
    setDraggingElemId(id);
    const elem = annotations.find((a) => a.id === id);
    if (elem) {
      setDragOffset({
        x: e.clientX - elem.x,
        y: e.clientY - elem.y,
      });
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!draggingElemId) return;
    const elem = annotations.find((a) => a.id === draggingElemId);
    if (!elem) return;
    const newX = Math.max(0, e.clientX - dragOffset.x);
    const newY = Math.max(0, e.clientY - dragOffset.y);

    setAnnotations((prev) =>
      prev.map((a) => (a.id === draggingElemId ? { ...a, x: newX, y: newY } : a))
    );
  };

  const handleContainerMouseUp = () => {
    if (draggingElemId) {
      pushHistory([...annotations]);
      setDraggingElemId(null);
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setAnnotations([]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId) return;
    const next = annotations.filter((a) => a.id !== selectedElementId);
    pushHistory(next);
    setSelectedElementId(null);
  };

  // Page management actions
  const rotateCurrentPage = (deg: number) => {
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === currentPageIndex ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p
      )
    );
  };

  const movePage = (dir: -1 | 1) => {
    const target = currentPageIndex + dir;
    if (target < 0 || target >= pages.length) return;
    const copy = [...pages];
    const temp = copy[currentPageIndex];
    copy[currentPageIndex] = copy[target];
    copy[target] = temp;
    setPages(copy);
    setCurrentPageIndex(target);
  };

  const deleteCurrentPage = () => {
    if (pages.length <= 1) {
      alert('Cannot delete the only remaining page.');
      return;
    }
    const nextPages = pages.filter((_, i) => i !== currentPageIndex);
    setPages(nextPages);
    setCurrentPageIndex(Math.min(currentPageIndex, nextPages.length - 1));
  };

  const addBlankPage = () => {
    const newPage: PageMeta = {
      pageNumber: -1,
      originalIndex: -1,
      rotation: 0,
      thumbnail: '',
      width: 595,
      height: 842,
    };
    const nextPages = [...pages];
    nextPages.splice(currentPageIndex + 1, 0, newPage);
    setPages(nextPages);
    setCurrentPageIndex(currentPageIndex + 1);
  };

  // Export edited PDF using pdf-lib
  async function handleExportPdf() {
    if (!file || pages.length === 0) return;
    setLoading(true);
    setProgressMsg('Rendering edits & compiling new PDF...');
    setSuccessInfo(null);

    try {
      const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');
      const srcDoc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();

      // Embed standard fonts
      const fontHelvetica = await outDoc.embedFont(StandardFonts.Helvetica);
      const fontHelveticaBold = await outDoc.embedFont(StandardFonts.HelveticaBold);
      const fontHelveticaOblique = await outDoc.embedFont(StandardFonts.HelveticaOblique);
      const fontTimes = await outDoc.embedFont(StandardFonts.TimesRoman);
      const fontTimesBold = await outDoc.embedFont(StandardFonts.TimesRomanBold);
      const fontCourier = await outDoc.embedFont(StandardFonts.Courier);
      const fontCourierBold = await outDoc.embedFont(StandardFonts.CourierBold);

      for (let i = 0; i < pages.length; i++) {
        const pageMeta = pages[i];
        let outPage: any = null;

        if (pageMeta.originalIndex >= 0) {
          const [copied] = await outDoc.copyPages(srcDoc, [pageMeta.originalIndex]);
          outPage = copied;
          if (pageMeta.rotation !== 0) {
            const rot = outPage.getRotation().angle;
            outPage.setRotation(degrees((rot + pageMeta.rotation) % 360));
          }
          outDoc.addPage(outPage);
        } else {
          // Blank A4 page
          outPage = outDoc.addPage([595.28, 841.89]);
        }

        const pageWidth = outPage.getWidth();
        const pageHeight = outPage.getHeight();

        // Get annotations belonging to this page (1-indexed)
        const pageAnnotations = annotations.filter((a) => a.pageNumber === i + 1);

        for (const annot of pageAnnotations) {
          // Scale conversion: UI coordinates on canvas are scaled by `scale`
          const scaleFactor = scale;
          const pdfX = annot.x / scaleFactor;
          const pdfW = annot.width / scaleFactor;
          const pdfH = annot.height / scaleFactor;
          const pdfY = pageHeight - (annot.y / scaleFactor) - pdfH;

          if (annot.type === 'text' && annot.text) {
            let font = fontHelvetica;
            if (annot.fontFamily === 'Times') font = annot.isBold ? fontTimesBold : fontTimes;
            else if (annot.fontFamily === 'Courier') font = annot.isBold ? fontCourierBold : fontCourier;
            else font = annot.isBold ? fontHelveticaBold : annot.isItalic ? fontHelveticaOblique : fontHelvetica;

            const c = hexToRgb(annot.color || '#000000');
            const fontSize = Math.max(8, (annot.fontSize || 16) / scaleFactor);

            if (annot.bgColor && annot.bgColor !== 'transparent') {
              const bg = hexToRgb(annot.bgColor);
              outPage.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH,
                color: rgb(bg.r, bg.g, bg.b),
              });
            }

            outPage.drawText(annot.text, {
              x: pdfX + 2,
              y: pdfY + pdfH - fontSize - 2,
              size: fontSize,
              font,
              color: rgb(c.r, c.g, c.b),
            });
          } else if (annot.type === 'whiteout' || annot.type === 'rect') {
            const bg = hexToRgb(annot.bgColor || (annot.type === 'whiteout' ? '#ffffff' : '#000000'));
            const border = annot.borderColor ? hexToRgb(annot.borderColor) : undefined;

            outPage.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              color: annot.bgColor === 'transparent' ? undefined : rgb(bg.r, bg.g, bg.b),
              borderColor: border ? rgb(border.r, border.g, border.b) : undefined,
              borderWidth: annot.borderWidth ?? (annot.type === 'rect' ? 2 : 0),
              opacity: annot.opacity ?? 1.0,
            });
          } else if (annot.type === 'stamp' && annot.stampText) {
            const border = annot.borderColor ? hexToRgb(annot.borderColor) : { r: 0.9, g: 0.1, b: 0.1 };
            const c = hexToRgb(annot.color || '#dc2626');
            const stampFontSize = Math.max(12, 18 / scaleFactor);

            outPage.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              borderColor: rgb(border.r, border.g, border.b),
              borderWidth: 2,
            });

            outPage.drawText(annot.stampText, {
              x: pdfX + (pdfW - stampFontSize * annot.stampText.length * 0.55) / 2,
              y: pdfY + (pdfH - stampFontSize) / 2,
              size: stampFontSize,
              font: fontHelveticaBold,
              color: rgb(c.r, c.g, c.b),
            });
          } else if ((annot.type === 'image' || annot.type === 'signature') && annot.imageDataUrl) {
            try {
              const imageBytes = await fetch(annot.imageDataUrl).then((res) => res.arrayBuffer());
              let embeddedImg: any;
              if (annot.imageDataUrl.includes('image/png')) {
                embeddedImg = await outDoc.embedPng(imageBytes);
              } else {
                embeddedImg = await outDoc.embedJpg(imageBytes);
              }

              outPage.drawImage(embeddedImg, {
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH,
              });
            } catch (err) {
              console.error('Failed to embed image in PDF:', err);
            }
          } else if ((annot.type === 'draw' || annot.type === 'highlight') && annot.drawPoints && annot.drawPoints.length > 1) {
            // Draw path lines
            const c = hexToRgb(annot.color || '#000000');
            const pts = annot.drawPoints;
            for (let p = 0; p < pts.length - 1; p++) {
              const startX = pts[p].x / scaleFactor;
              const startY = pageHeight - (pts[p].y / scaleFactor);
              const endX = pts[p + 1].x / scaleFactor;
              const endY = pageHeight - (pts[p + 1].y / scaleFactor);

              outPage.drawLine({
                start: { x: startX, y: startY },
                end: { x: endX, y: endY },
                thickness: (annot.lineWidth || 3) / scaleFactor,
                color: rgb(c.r, c.g, c.b),
                opacity: annot.opacity ?? 1.0,
              });
            }
          }
        }

        // Global Watermark
        if (watermarkText.trim()) {
          const wmColor = rgb(0.7, 0.7, 0.7);
          outPage.drawText(watermarkText.trim(), {
            x: pageWidth / 4,
            y: pageHeight / 2,
            size: 40,
            font: fontHelveticaBold,
            color: wmColor,
            opacity: 0.25,
            rotate: degrees(45),
          });
        }

        // Global Page Numbering
        if (enablePageNumbers) {
          const numText = `Page ${i + 1} of ${pages.length}`;
          outPage.drawText(numText, {
            x: pageWidth / 2 - 30,
            y: 20,
            size: 10,
            font: fontHelvetica,
            color: rgb(0.4, 0.4, 0.4),
          });
        }
      }

      const outBytes = await outDoc.save({ useObjectStreams: true });
      const filename = outputName.toLowerCase().endsWith('.pdf') ? outputName : `${outputName}.pdf`;
      downloadBlob(new Blob([outBytes as BlobPart], { type: 'application/pdf' }), filename);
      setSuccessInfo({ size: outBytes.byteLength });
    } catch (e) {
      console.error(e);
      alert('Failed to export edited PDF. Please check your annotations.');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  }

  const currentPage = pages[currentPageIndex];
  const currentPageAnnotations = annotations.filter((a) => a.pageNumber === currentPageIndex + 1);

  return (
    <ToolLayout slug="pdf/edit">
      <div className="space-y-4">
        {!file ? (
          <FileDropzone
            accept=".pdf,application/pdf"
            onFiles={(fs) => setFile(fs[0])}
            label="Choose a PDF file to edit"
            hint="Add text, signatures, shapes, highlight, images, whiteout, and manage pages"
          />
        ) : (
          <div className="space-y-4 select-none">
            {/* Top Navigation & Actions Bar */}
            <Card>
              <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm truncate max-w-xs">{file.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                  </Badge>
                </div>

                {/* Undo / Redo & Zoom & Save Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    disabled={historyIndex < 0}
                    title="Undo"
                    className="h-8 w-8"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo"
                    className="h-8 w-8"
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>

                  <div className="h-4 w-px bg-border mx-1" />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
                    title="Zoom Out"
                    className="h-8 w-8"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-mono text-muted-foreground w-12 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
                    title="Zoom In"
                    className="h-8 w-8"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>

                  <div className="h-4 w-px bg-border mx-1" />

                  <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Change
                  </Button>

                  <Button
                    onClick={handleExportPdf}
                    disabled={loading || pages.length === 0}
                    size="sm"
                    className="font-semibold bg-primary"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Download className="h-3.5 w-3.5 mr-1" />
                    )}
                    Save & Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Main Editor Grid (Sidebar + Canvas + Property bar) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Left Sidebar: Page thumbnails & management */}
              <div className="md:col-span-3 space-y-3">
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Pages ({pages.length})
                      </span>
                      <Button variant="ghost" size="sm" onClick={addBlankPage} className="h-7 text-xs px-2">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Blank
                      </Button>
                    </div>

                    {/* Thumbnails strip */}
                    <div className="max-h-[600px] overflow-y-auto space-y-2 pr-1">
                      {pages.map((p, idx) => (
                        <div
                          key={`${p.pageNumber}-${idx}`}
                          onClick={() => setCurrentPageIndex(idx)}
                          className={`group relative flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                            idx === currentPageIndex
                              ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                              : 'border-border hover:border-foreground/30 hover:bg-muted/40'
                          }`}
                        >
                          <span className="font-mono text-xs text-muted-foreground w-5 text-center">
                            {idx + 1}
                          </span>
                          <div className="h-16 w-12 bg-white dark:bg-zinc-900 border rounded flex items-center justify-center overflow-hidden shrink-0">
                            {p.thumbnail ? (
                              <img
                                src={p.thumbnail}
                                alt={`Page ${idx + 1}`}
                                style={{ transform: `rotate(${p.rotation}deg)` }}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="font-medium truncate">
                              {p.pageNumber === -1 ? 'Blank Page' : `Page ${p.pageNumber}`}
                            </div>
                            {p.rotation !== 0 && (
                              <span className="text-[10px] text-muted-foreground">{p.rotation}°</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Page Actions */}
                    <div className="pt-2 border-t space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">Current Page Actions:</span>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rotateCurrentPage(-90)}
                          className="h-7 text-xs"
                          title="Rotate 90° CCW"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Left
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rotateCurrentPage(90)}
                          className="h-7 text-xs"
                          title="Rotate 90° CW"
                        >
                          <RotateCw className="h-3 w-3 mr-1" /> Right
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => movePage(-1)}
                          disabled={currentPageIndex === 0}
                          className="h-7 text-xs"
                        >
                          <MoveUp className="h-3 w-3 mr-1" /> Move Up
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => movePage(1)}
                          disabled={currentPageIndex === pages.length - 1}
                          className="h-7 text-xs"
                        >
                          <MoveDown className="h-3 w-3 mr-1" /> Move Down
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deleteCurrentPage}
                        className="w-full h-7 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete Current Page
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Watermark & Header/Footer Settings */}
                <Card>
                  <CardContent className="p-3 space-y-3 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                      Document Options
                    </span>
                    <div className="space-y-1">
                      <Label className="text-xs">Watermark Text</Label>
                      <Input
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="e.g. CONFIDENTIAL"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="enableNum"
                        checked={enablePageNumbers}
                        onChange={(e) => setEnablePageNumbers(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="enableNum" className="cursor-pointer">
                        Add Page Numbers at bottom
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Center Canvas Area + Toolbar */}
              <div className="md:col-span-9 space-y-3">
                {/* Annotation Tools Selector */}
                <Card>
                  <CardContent className="p-2.5 flex flex-wrap items-center gap-1.5">
                    <Button
                      variant={activeTool === 'select' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTool('select')}
                      className="h-8 text-xs"
                    >
                      Select
                    </Button>
                    <Button
                      variant={activeTool === 'text' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTool('text')}
                      className="h-8 text-xs"
                    >
                      <Type className="h-3.5 w-3.5 mr-1" /> Text
                    </Button>
                    <Button
                      variant={activeTool === 'draw' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTool('draw')}
                      className="h-8 text-xs"
                    >
                      <Pen className="h-3.5 w-3.5 mr-1" /> Draw
                    </Button>
                    <Button
                      variant={activeTool === 'highlight' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTool('highlight')}
                      className="h-8 text-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" /> Highlight
                    </Button>
                    <Button
                      variant={activeTool === 'whiteout' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTool('whiteout')}
                      className="h-8 text-xs"
                    >
                      <Eraser className="h-3.5 w-3.5 mr-1" /> Whiteout
                    </Button>
                    <Button
                      variant={activeTool === 'rect' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTool('rect')}
                      className="h-8 text-xs"
                    >
                      <Square className="h-3.5 w-3.5 mr-1" /> Rectangle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSignatureModal(true)}
                      className="h-8 text-xs"
                    >
                      <Stamp className="h-3.5 w-3.5 mr-1" /> Signature
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => imageInputRef.current?.click()}
                      className="h-8 text-xs"
                    >
                      <ImageIcon className="h-3.5 w-3.5 mr-1" /> Image
                    </Button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUploaded}
                    />

                    {/* Stamp Presets Dropdown */}
                    <div className="flex items-center gap-1 ml-auto">
                      {STAMPS.slice(0, 3).map((st) => (
                        <Button
                          key={st.label}
                          variant="ghost"
                          size="sm"
                          onClick={() => addStamp(st)}
                          className="h-7 text-[10px] px-1.5 font-bold border"
                          style={{ color: st.color, borderColor: st.border }}
                        >
                          {st.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Sub-tool options bar (Text properties, colors, font sizes) */}
                <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/40 rounded-lg border text-xs">
                  {/* Colors */}
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground mr-1">Color:</span>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCurrentColor(c)}
                        className={`h-5 w-5 rounded-full border transition-transform ${
                          currentColor === c ? 'scale-110 ring-2 ring-primary' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      className="h-5 w-5 p-0 border rounded cursor-pointer ml-1"
                    />
                  </div>

                  <div className="h-4 w-px bg-border mx-1" />

                  {/* Font properties */}
                  <div className="flex items-center gap-2">
                    <select
                      value={currentFontFamily}
                      onChange={(e) => setCurrentFontFamily(e.target.value as any)}
                      className="h-7 rounded border bg-background px-2 text-xs"
                    >
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times">Times Roman</option>
                      <option value="Courier">Courier</option>
                    </select>

                    <select
                      value={currentFontSize}
                      onChange={(e) => setCurrentFontSize(Number(e.target.value))}
                      className="h-7 rounded border bg-background px-2 text-xs"
                    >
                      {[10, 12, 14, 16, 18, 20, 24, 28, 32, 40].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}px
                        </option>
                      ))}
                    </select>

                    <Button
                      variant={isBold ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setIsBold(!isBold)}
                      className="h-7 w-7 p-0 font-bold"
                    >
                      B
                    </Button>
                    <Button
                      variant={isItalic ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setIsItalic(!isItalic)}
                      className="h-7 w-7 p-0 italic"
                    >
                      I
                    </Button>
                  </div>

                  {selectedElementId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deleteSelectedElement}
                      className="h-7 text-xs text-destructive hover:bg-destructive/10 ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Selected
                    </Button>
                  )}
                </div>

                {/* Canvas Workspace Viewport */}
                <div
                  className="relative overflow-auto border rounded-xl bg-zinc-100 dark:bg-zinc-900 p-4 flex justify-center min-h-[600px]"
                  onMouseMove={handleContainerMouseMove}
                  onMouseUp={handleContainerMouseUp}
                >
                  <div
                    className="relative bg-white shadow-xl rounded overflow-hidden select-none"
                    style={{
                      width: pageCanvasRef.current?.width || 'auto',
                      height: pageCanvasRef.current?.height || 'auto',
                      cursor:
                        activeTool === 'text'
                          ? 'text'
                          : activeTool === 'draw' || activeTool === 'highlight'
                          ? 'crosshair'
                          : activeTool === 'whiteout' || activeTool === 'rect'
                          ? 'crosshair'
                          : 'default',
                    }}
                    onClick={handleCanvasClick}
                    onMouseDown={handleOverlayMouseDown}
                    onMouseMove={handleOverlayMouseMove}
                    onMouseUp={handleOverlayMouseUp}
                  >
                    {/* Rendered PDF Page Canvas */}
                    <canvas ref={pageCanvasRef} className="block" />

                    {/* Freehand in-progress drawing canvas overlay */}
                    <canvas
                      ref={drawOverlayCanvasRef}
                      width={pageCanvasRef.current?.width || 600}
                      height={pageCanvasRef.current?.height || 800}
                      className="absolute inset-0 pointer-events-none"
                    />

                    {/* Page Annotations Overlay */}
                    {currentPageAnnotations.map((annot) => {
                      const isSelected = selectedElementId === annot.id;
                      return (
                        <div
                          key={annot.id}
                          onMouseDown={(e) => handleElementMouseDown(e, annot.id)}
                          style={{
                            left: annot.x,
                            top: annot.y,
                            width: annot.width,
                            height: annot.height,
                            position: 'absolute',
                            cursor: activeTool === 'select' ? 'move' : 'pointer',
                          }}
                          className={`group/item transition-shadow ${
                            isSelected
                              ? 'ring-2 ring-primary ring-offset-1 rounded'
                              : 'hover:ring-1 hover:ring-foreground/30'
                          }`}
                        >
                          {/* Text Element */}
                          {annot.type === 'text' && (
                            <textarea
                              value={annot.text}
                              onChange={(e) => {
                                const newText = e.target.value;
                                setAnnotations((prev) =>
                                  prev.map((a) => (a.id === annot.id ? { ...a, text: newText } : a))
                                );
                              }}
                              style={{
                                fontSize: annot.fontSize || currentFontSize,
                                fontFamily: annot.fontFamily || currentFontFamily,
                                fontWeight: annot.isBold ? 'bold' : 'normal',
                                fontStyle: annot.isItalic ? 'italic' : 'normal',
                                color: annot.color || currentColor,
                                backgroundColor: annot.bgColor || 'transparent',
                              }}
                              className="w-full h-full resize bg-transparent border-none outline-none p-1 leading-tight overflow-hidden"
                            />
                          )}

                          {/* Whiteout / Rect */}
                          {(annot.type === 'whiteout' || annot.type === 'rect') && (
                            <div
                              style={{
                                backgroundColor: annot.bgColor || '#ffffff',
                                borderColor: annot.borderColor || '#000000',
                                borderWidth: annot.borderWidth || 0,
                                opacity: annot.opacity || 1.0,
                              }}
                              className="w-full h-full border-solid"
                            />
                          )}

                          {/* Stamp */}
                          {annot.type === 'stamp' && (
                            <div
                              style={{
                                borderColor: annot.borderColor || '#dc2626',
                                color: annot.color || '#dc2626',
                                borderWidth: annot.borderWidth || 3,
                              }}
                              className="w-full h-full border-2 border-solid rounded flex items-center justify-center font-bold tracking-widest text-center uppercase p-1 bg-white/60"
                            >
                              {annot.stampText}
                            </div>
                          )}

                          {/* Image or Signature */}
                          {(annot.type === 'image' || annot.type === 'signature') && annot.imageDataUrl && (
                            <img
                              src={annot.imageDataUrl}
                              alt="Annotation"
                              className="w-full h-full object-contain pointer-events-none"
                            />
                          )}

                          {/* Draw / Highlight SVGs */}
                          {(annot.type === 'draw' || annot.type === 'highlight') && annot.drawPoints && (
                            <svg className="w-full h-full overflow-visible pointer-events-none">
                              <polyline
                                points={annot.drawPoints.map((p) => `${p.x - annot.x},${p.y - annot.y}`).join(' ')}
                                fill="none"
                                stroke={annot.color || '#000000'}
                                strokeWidth={annot.lineWidth || 3}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={annot.opacity ?? 1.0}
                              />
                            </svg>
                          )}

                          {/* Delete badge on hover */}
                          {isSelected && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSelectedElement();
                              }}
                              className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow hover:scale-110"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {successInfo && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Successfully exported edited PDF ({formatBytes(successInfo.size)})! File has been downloaded.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Signature Modal */}
            {showSignatureModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                <Card className="w-full max-w-md bg-background shadow-2xl">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <span className="font-semibold text-base">Add Your Signature</span>
                      <Button variant="ghost" size="icon" onClick={() => setShowSignatureModal(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant={signatureType === 'draw' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSignatureType('draw')}
                        className="flex-1"
                      >
                        <Pen className="h-3.5 w-3.5 mr-1" /> Draw
                      </Button>
                      <Button
                        variant={signatureType === 'type' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSignatureType('type')}
                        className="flex-1"
                      >
                        <Type className="h-3.5 w-3.5 mr-1" /> Type
                      </Button>
                    </div>

                    {signatureType === 'draw' ? (
                      <div className="space-y-2">
                        <div className="border-2 border-dashed rounded-lg bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
                          <canvas
                            ref={signatureCanvasRef}
                            width={380}
                            height={160}
                            className="w-full h-40 cursor-crosshair"
                            onMouseDown={(e) => {
                              setIsSigDrawing(true);
                              const canvas = signatureCanvasRef.current;
                              if (!canvas) return;
                              const rect = canvas.getBoundingClientRect();
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.strokeStyle = currentColor || '#000000';
                                ctx.lineWidth = 2.5;
                                ctx.lineCap = 'round';
                                ctx.beginPath();
                                ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                              }
                            }}
                            onMouseMove={(e) => {
                              if (!isSigDrawing) return;
                              const canvas = signatureCanvasRef.current;
                              if (!canvas) return;
                              const rect = canvas.getBoundingClientRect();
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                                ctx.stroke();
                              }
                            }}
                            onMouseUp={() => setIsSigDrawing(false)}
                            onMouseLeave={() => setIsSigDrawing(false)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const canvas = signatureCanvasRef.current;
                            if (canvas) {
                              const ctx = canvas.getContext('2d');
                              if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                            }
                          }}
                          className="h-7 text-xs text-muted-foreground"
                        >
                          Clear canvas
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          value={typedSignature}
                          onChange={(e) => setTypedSignature(e.target.value)}
                          placeholder="Type your name..."
                          className="h-10 text-base"
                        />
                        {typedSignature && (
                          <div className="p-4 bg-muted/40 rounded-lg border text-center font-serif text-2xl italic">
                            {typedSignature}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 justify-end pt-2">
                      <Button variant="outline" onClick={() => setShowSignatureModal(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveSignature}>
                        Insert Signature
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
