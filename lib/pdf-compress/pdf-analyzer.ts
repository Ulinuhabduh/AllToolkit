/**
 * pdf-analyzer — inspect a PDF BEFORE deciding how to compress it.
 *
 * Combines:
 *  - pdf-lib structural parse (pages, image XObjects with real dimensions,
 *    filters, colorspace, transparency, AcroForm, encryption), and
 *  - raw content heuristics (text operators, vector operators).
 *
 * Never mutates the input. Never rasterizes.
 */
import { promises as fs } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import type { PdfAnalysis, PdfImageInfo } from './types';

/**
 * Most real-world PDFs store content + object streams Flate-compressed, so
 * raw-byte regex would see nothing. Inflate every `stream…endstream` block
 * (best-effort, capped) and search raw + inflated text together.
 */
function searchableText(buf: Buffer): string {
  const raw = buf.toString('latin1');
  const parts: string[] = [raw];
  let totalInflated = 0;
  const MAX_INFLATED = 24 * 1024 * 1024;
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(raw)) !== null && guard++ < 4000) {
    if (totalInflated >= MAX_INFLATED) break;
    const payload = Buffer.from(m[1], 'latin1');
    if (payload.length < 12) continue;
    try {
      const out = inflateSync(payload);
      totalInflated += out.length;
      parts.push(out.toString('latin1'));
    } catch {
      /* not a flate stream (images, encrypted strings, …) — skip */
    }
  }
  return parts.join('\n');
}

function countMatches(text: string, pattern: RegExp): number {
  const m = text.match(pattern);
  return m ? m.length : 0;
}

export async function analyzePdf(inputPath: string): Promise<PdfAnalysis> {
  const file = await fs.readFile(inputPath);
  const fileSize = file.length;

  // Search raw + inflated streams (most PDFs Flate-compress their content).
  const text = searchableText(file);
  const pageMarkers = countMatches(text, /\/Type\s*\/Page[^s]/g);
  const textOps =
    countMatches(text, /\bBT\b/g) +
    countMatches(text, /\bTj\b/g) +
    countMatches(text, /\bTJ\b/g) +
    countMatches(text, /\/Font\b/g);
  const vectorOps =
    countMatches(text, /\bre\b/g) +
    countMatches(text, /\bm\s+[\d.\-]+\s+[\d.\-]+\s+l\b/g) +
    countMatches(text, /\bf\b(?![a-zA-Z])/g);
  const hasTransparencyRaw = /\/SMask|\/CA\s+0\.[0-8]|\/ca\s+0\.[0-8]/.test(text);
  const hasFormsRaw = /\/AcroForm|\/Widget/.test(text);
  const encryptedRaw = /\/Encrypt/.test(text);

  let pages = 0;
  let images: PdfImageInfo[] = [];
  let fontCount = 0;
  let hasTransparency = hasTransparencyRaw;
  let hasForms = hasFormsRaw;
  let encrypted = encryptedRaw;

  try {
    const doc = await PDFDocument.load(file, { ignoreEncryption: true });
    pages = doc.getPageCount();
    encrypted = (doc as unknown as { isEncrypted?: boolean }).isEncrypted ?? encryptedRaw;

    // Page sizes for effective-DPI estimation (use max-area page as reference).
    let refArea = 0;
    let refW = 595;
    let refH = 842;
    for (let i = 0; i < pages; i++) {
      try {
        const s = doc.getPage(i).getSize();
        const area = s.width * s.height;
        if (area > refArea) {
          refArea = area;
          refW = s.width;
          refH = s.height;
        }
      } catch {
        /* ignore broken page boxes */
      }
    }
    const refWIn = refW / 72;
    const refHIn = refH / 72;

    try {
      const form = doc.getForm?.();
      if (form) {
        const fields = form.getFields?.() ?? [];
        if (fields.length > 0) hasForms = true;
      }
    } catch {
      /* no form support needed */
    }

    const fontNames = new Set<string>();
    const ctx = doc.context;
    const indirect = ctx.enumerateIndirectObjects();
    for (const [, obj] of indirect) {
      if (obj instanceof PDFRawStream) {
        const dict = obj.dict;
        const subtype = dict.get(PDFName.of('Subtype'));
        if (subtype === PDFName.of('Image')) {
          const w = Number(dict.get(PDFName.of('Width'))?.toString() ?? 0) || 0;
          const h = Number(dict.get(PDFName.of('Height'))?.toString() ?? 0) || 0;
          const bpc = Number(dict.get(PDFName.of('BitsPerComponent'))?.toString() ?? 8) || 8;
          const cs = dict.get(PDFName.of('ColorSpace'))?.toString() ?? 'Unknown';
          const filterRaw = dict.get(PDFName.of('Filter'))?.toString() ?? '';
          const filters = filterRaw
            .replace(/[\[\]]/g, ' ')
            .split('/')
            .map((s) => s.trim())
            .filter(Boolean);
          const smask = dict.get(PDFName.of('SMask'));
          if (smask) hasTransparency = true;
          let byteLength = 0;
          try {
            byteLength = obj.getContents?.()?.length ?? (obj as unknown as { contents?: Uint8Array }).contents?.length ?? 0;
          } catch {
            byteLength = 0;
          }
          // Effective DPI if this image covered the whole reference page.
          const dpiW = refWIn > 0 && w > 0 ? w / refWIn : 0;
          const dpiH = refHIn > 0 && h > 0 ? h / refHIn : 0;
          images.push({
            width: w,
            height: h,
            bitsPerComponent: bpc,
            colorSpace: cs,
            filters,
            byteLength,
            effectiveDpi: Math.max(dpiW, dpiH),
          });
        } else if (
          dict.get(PDFName.of('Subtype')) === PDFName.of('Form') ||
          dict.get(PDFName.of('ExtGState')) !== undefined
        ) {
          // Transparency can also hide in ExtGState; raw scan already covers it.
        }
      }
      // Font counting: any dict with /BaseFont
      try {
        const asDict = obj as unknown as { get?: (k: unknown) => unknown };
        if (typeof asDict.get === 'function' && asDict.get(PDFName.of('BaseFont'))) {
          fontNames.add(String(asDict.get(PDFName.of('BaseFont'))));
        }
      } catch {
        /* not a dict */
      }
    }
    fontCount = fontNames.size || countMatches(text, /\/BaseFont/g);
  } catch {
    // pdf-lib failed (corrupt/odd PDF) — fall back to raw heuristics only.
    pages = pageMarkers;
    images = [];
    fontCount = countMatches(text, /\/BaseFont/g);
  }

  const imageCount = images.length;
  const imageBytes = images.reduce((a, im) => a + im.byteLength, 0);
  // XObject byteLength via getContents() is often 0 (contents stored compressed
  // in the raw stream, not exposed). Fall back to filter-based estimate.
  const estimatedImageRatio =
    fileSize > 0
      ? imageBytes > 0
        ? Math.min(1, imageBytes / fileSize)
        : estimateImageRatioFromFilters(file)
      : 0;

  const avgTextOpsPerPage = pages > 0 ? textOps / pages : 0;

  // Scan heuristic: ≥1 large image per page on average, each covering most of
  // a page at a plausible scan DPI, with almost no text operators.
  const largeImages = images.filter((im) => im.effectiveDpi >= 90).length;
  const isScanned =
    pages > 0 &&
    imageCount >= pages &&
    largeImages >= pages &&
    avgTextOpsPerPage < 8;

  const isImageHeavy = estimatedImageRatio > 0.5 || (imageCount >= pages && estimatedImageRatio > 0.35);
  const isTextVectorHeavy = !isImageHeavy && (textOps > pages * 5 || vectorOps > pages * 10);

  const strategy: PdfAnalysis['strategy'] = isScanned || isImageHeavy
    ? 'focus-images'
    : isTextVectorHeavy
      ? 'structural-only'
      : 'balanced';

  return {
    pages,
    fileSize,
    imageCount,
    imageBytes,
    images,
    textOps,
    fontCount,
    vectorOps,
    estimatedImageRatio,
    hasTransparency,
    hasForms,
    encrypted,
    isScanned,
    isImageHeavy,
    isTextVectorHeavy,
    strategy,
  };
}

/** Fallback ratio estimate from image filter streams in raw bytes. */
function estimateImageRatioFromFilters(file: Buffer): number {
  const text = file.toString('latin1');
  // Sum declared /Length of streams whose dict mentions an image filter.
  let total = 0;
  const re = /\/Subtype\s*\/Image[\s\S]{0,600}?\/Length\s+(\d+)/g;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(text)) !== null && guard++ < 5000) {
    total += parseInt(m[1], 10) || 0;
  }
  if (total === 0) {
    // Cruder: any DCTDecode stream lengths.
    const re2 = /\/Filter\s*(\[\s*)?\/DCTDecode[\s\S]{0,300}?\/Length\s+(\d+)/g;
    while ((m = re2.exec(text)) !== null && guard++ < 10000) {
      total += parseInt(m[2], 10) || 0;
    }
  }
  return file.length > 0 ? Math.min(1, total / file.length) : 0;
}
