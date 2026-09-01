/**
 * Shared PDF utilities for rendering, page range parsing, and PDF.js worker setup.
 */

export async function getPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      // @ts-ignore
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    } catch {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    }
  }
  return pdfjs;
}

export async function loadPdfJsDoc(data: ArrayBuffer | Uint8Array) {
  const pdfjs = await getPdfJs();
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const loadingTask = pdfjs.getDocument({ data: bytes });
  return await loadingTask.promise;
}

export async function renderPageToCanvas(
  pdfDoc: any,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale = 1.0
): Promise<{ width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');
  
  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  } as any).promise;

  return { width: viewport.width, height: viewport.height };
}

export async function renderPageThumbnail(
  pdfDoc: any,
  pageNum: number,
  maxDimension = 200
): Promise<string> {
  const page = await pdfDoc.getPage(pageNum);
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const scale = maxDimension / Math.max(unscaledViewport.width, unscaledViewport.height);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  } as any).promise;

  return canvas.toDataURL('image/jpeg', 0.85);
}

export function parseRanges(input: string, totalPages: number): number[][] {
  const result: number[][] = [];
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const a = parseInt(startStr, 10);
      const b = parseInt(endStr, 10);
      if (Number.isFinite(a) && Number.isFinite(b) && a >= 1 && b <= totalPages && a <= b) {
        result.push(Array.from({ length: b - a + 1 }, (_, i) => a + i - 1));
      }
    } else {
      const n = parseInt(part, 10);
      if (Number.isFinite(n) && n >= 1 && n <= totalPages) {
        result.push([n - 1]);
      }
    }
  }
  return result;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (Number.isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}
