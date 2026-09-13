/**
 * image-optimizer — sharp (libvips) based recompression for extracted raster
 * images. Used by the scan-rebuild pass: full-page scan images are extracted
 * with `pdfimages`, recompressed here with profile quality/DPI, then rebuilt
 * into a PDF with original page sizes preserved.
 *
 * Rules (per spec):
 *  - photo/continuous-tone → JPEG at profile quality
 *  - screenshot/line-art/diagram → PNG (lossless) when JPEG would artefact
 *    or when the source is flat-colour; never force JPEG blindly
 *  - monochrome → 1-bit-ish PNG (palette/greyscale), never JPEG
 *  - grayscale stays grayscale
 *  - alpha is flattened ONLY when fully opaque (safe) or when the caller
 *    explicitly allows it for JPEG output over a white page
 *  - NEVER upscale: source DPI <= target DPI → keep dimensions
 */
import sharp from 'sharp';
import type { CompressionProfile, ImageKind } from './types';

export interface RecompressOptions {
  /** JPEG quality override (defaults to profile.jpegQuality). */
  quality?: number;
  /** Target DPI for downsampling (no upscale ever). */
  targetDpi?: number;
  /** Display size of the image on the page, in PDF points. */
  displayWidthPt?: number;
  displayHeightPt?: number;
  /** Max pixel side clamp to avoid OOM. */
  maxSidePx?: number;
}

export interface RecompressResult {
  data: Buffer;
  format: 'jpeg' | 'png';
  width: number;
  height: number;
  kind: ImageKind;
}

/**
 * Classify an image buffer. Pure function of pixels — no guessing from names.
 *
 * Measured separation (4-bit quantized unique colours on a 256px thumb):
 *   flat diagram / UI screenshot .... ~10–20
 *   bilevel B/W page ................ ~2–8
 *   continuous-tone photo ........... ~400+
 * Multi-colour flat graphics have HIGH stdev, so variance alone cannot
 * separate them from photos — unique-colour count is the discriminator.
 */
const KIND_THUMB = 256;
/**
 * > this many quantized colours ⇒ continuous tone (photo/grayscale).
 * Calibrated: flat diagrams/screenshots ~10–20, gradient scenes ~150,
 * real photos 1000+. Sits safely between flat graphics and imagery.
 */
const CONTINUOUS_TONE_MIN_COLOURS = 100;

export async function detectImageKind(input: Buffer): Promise<ImageKind> {
  // Grayscale-family first: 4-bit colour counting is blind here (a gray
  // image can hold at most 16 distinct 4-bit values by construction).
  if (await isEffectivelyGrayscale(input)) {
    // Clean ink-on-paper has almost no mid-tones (only AA edges);
    // shaded/grayscale content does.
    if ((await midToneFraction(input)) <= 0.12) return 'monochrome';
    if ((await countGrayLevels(input, KIND_THUMB)) <= 60) return 'lineart';
    return 'grayscale';
  }
  const unique = await countUniqueColours(input, KIND_THUMB);
  if (unique <= CONTINUOUS_TONE_MIN_COLOURS) {
    // Flat-colour graphics: screenshots, diagrams, slides, charts,
    // coloured stamps — never forced to JPEG (no ringing artefacts).
    return 'lineart';
  }
  return 'photo';
}

async function thumbRaw(input: Buffer, size: number): Promise<{ data: Buffer; channels: number }> {
  const { data, info } = await sharp(input)
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: Buffer.from(data), channels: info.channels };
}

async function countUniqueColours(input: Buffer, thumbSize: number): Promise<number> {
  try {
    const { data, channels } = await thumbRaw(input, thumbSize);
    const seen = new Set<number>();
    const step = channels >= 3 ? channels : 1;
    for (let i = 0; i < data.length; i += step) {
      // Quantize to 4 bits/channel to ignore JPEG ringing noise.
      const r = data[i] >> 4;
      const g = step > 1 ? data[i + 1] >> 4 : r;
      const b = step > 2 ? data[i + 2] >> 4 : r;
      seen.add((r << 8) | (g << 4) | b);
      if (seen.size > 4096) break;
    }
    return seen.size;
  } catch {
    return 4096;
  }
}

async function isEffectivelyGrayscale(input: Buffer): Promise<boolean> {
  try {
    const { data, channels } = await thumbRaw(input, 48);
    if (channels < 3) return true;
    let diff = 0;
    const n = Math.floor(data.length / channels);
    for (let i = 0; i < data.length; i += channels) {
      diff += Math.abs(data[i] - data[i + 1]) + Math.abs(data[i + 1] - data[i + 2]);
    }
    return diff / n < 24;
  } catch {
    return false;
  }
}

type SharpPipe = ReturnType<typeof sharp>;
type ImgMeta = Awaited<ReturnType<SharpPipe['metadata']>>;

async function recompressAsGrayscale(
  pipe: SharpPipe,
  size: { width: number; height: number },
  quality: number,
  profile: CompressionProfile,
  meta?: ImgMeta,
  input?: Buffer
): Promise<RecompressResult> {
  const m0 = meta ?? (input ? await sharp(input).metadata() : undefined);
  let p = pipe.greyscale();
  if (input) {
    const flatOpaque = await isAlphaFullyOpaque(input);
    if (!flatOpaque && (m0?.hasAlpha || m0?.channels === 2)) {
      p = p.flatten({ background: '#ffffff' });
    }
  }
  const out = await p
    .jpeg({ quality, mozjpeg: true, chromaSubsampling: profile.jpegSubsampling })
    .toBuffer();
  const m = await sharp(out).metadata();
  return {
    data: out,
    format: 'jpeg',
    width: m.width ?? size.width,
    height: m.height ?? size.height,
    kind: 'grayscale',
  };
}

/**
 * Fraction of pixels with mid-tone luminance (shading vs. clean B/W).
 * Measured at FULL resolution with stride sampling: downscaled thumbs blur
 * thin black text into gray and would inflate the fraction.
 */
async function midToneFraction(input: Buffer): Promise<number> {
  try {
    const { data } = await sharp(input)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const stride = Math.max(1, Math.floor(data.length / 200_000));
    let mid = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += stride) {
      n++;
      if (data[i] >= 64 && data[i] <= 192) mid++;
    }
    return n > 0 ? mid / n : 0;
  } catch {
    return 0;
  }
}

/** Distinct 8-bit gray levels (0-255) on a thumb — texture measure for gray images. */
async function countGrayLevels(input: Buffer, thumbSize: number): Promise<number> {
  try {
    const { data } = await sharp(input)
      .resize(thumbSize, thumbSize, { fit: 'inside', withoutEnlargement: true })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return new Set(data).size;
  } catch {
    return 256;
  }
}

async function isAlphaFullyOpaque(input: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(input).metadata();
    if (!meta.hasAlpha) return true;
    const stats = await sharp(input).stats();
    const alpha = stats.channels[3];
    if (!alpha) return true;
    return (alpha.min ?? 0) >= 250;
  } catch {
    return false;
  }
}

/**
 * Compute output dimensions. Returns source dims unchanged when the source
 * is already at/below target DPI (never upscale), per spec.
 */
export function computeTargetSize(
  srcW: number,
  srcH: number,
  displayWpt: number,
  displayHpt: number,
  targetDpi: number,
  maxSidePx = 3300
): { width: number; height: number; downsampled: boolean } {
  const wIn = Math.max(displayWpt, 1) / 72;
  const hIn = Math.max(displayHpt, 1) / 72;
  const srcDpi = Math.max(srcW / wIn, srcH / hIn);
  let w = srcW;
  let h = srcH;
  let downsampled = false;
  if (srcDpi > targetDpi * 1.02) {
    const ratio = targetDpi / srcDpi;
    w = Math.max(1, Math.round(srcW * ratio));
    h = Math.max(1, Math.round(srcH * ratio));
    downsampled = true;
  }
  const longest = Math.max(w, h);
  if (longest > maxSidePx) {
    const r = maxSidePx / longest;
    w = Math.max(1, Math.round(w * r));
    h = Math.max(1, Math.round(h * r));
    downsampled = true;
  }
  return { width: w, height: h, downsampled };
}

export async function recompressImage(
  input: Buffer,
  profile: CompressionProfile,
  opts: RecompressOptions = {}
): Promise<RecompressResult> {
  const kind = await detectImageKind(input);
  const quality = opts.quality ?? profile.jpegQuality;
  const meta = await sharp(input).metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;
  if (!srcW || !srcH) throw new Error('Unreadable image dimensions');

  const targetDpi =
    opts.targetDpi ?? (kind === 'monochrome' ? profile.monochromeDpi : profile.colorDpi);
  const dispW = opts.displayWidthPt ?? (srcW * 72) / targetDpi;
  const dispH = opts.displayHeightPt ?? (srcH * 72) / targetDpi;
  const size = computeTargetSize(srcW, srcH, dispW, dispH, targetDpi, opts.maxSidePx);

  let pipe = sharp(input);
  if (size.downsampled) {
    pipe = pipe.resize(size.width, size.height, {
      fit: 'fill',
      kernel: 'lanczos3',
      withoutEnlargement: true,
    });
  } else if (Math.max(srcW, srcH) > (opts.maxSidePx ?? 3300)) {
    pipe = pipe.resize(opts.maxSidePx ?? 3300, opts.maxSidePx ?? 3300, {
      fit: 'inside',
      kernel: 'lanczos3',
      withoutEnlargement: true,
    });
  }

  // Format choice per kind — never blind JPEG.
  if (kind === 'monochrome') {
    // Guard: a "near-gray" image with lots of mid-tones (e.g. gray UI,
    // shaded illustration) is NOT a bilevel document — binarizing it would
    // destroy shading. Fall through to the grayscale JPEG path instead.
    if ((await midToneFraction(input)) > 0.12) {
      return recompressAsGrayscale(pipe, size, quality, profile);
    }
    const out = await pipe
      .greyscale()
      .threshold(128)
      .png({ compressionLevel: 9, palette: true, colours: 2 })
      .toBuffer();
    const m = await sharp(out).metadata();
    return { data: out, format: 'png', width: m.width ?? size.width, height: m.height ?? size.height, kind };
  }
  if (kind === 'lineart') {
    // Try PNG; fall back to high-quality JPEG only if PNG is clearly worse
    // AND the image is photographic enough — here: keep PNG, it's the safe
    // choice for diagrams/screenshots (no ringing artefacts).
    const out = await pipe.png({ compressionLevel: 9, palette: true }).toBuffer();
    const m = await sharp(out).metadata();
    return { data: out, format: 'png', width: m.width ?? size.width, height: m.height ?? size.height, kind };
  }
  if (kind === 'grayscale') {
    return recompressAsGrayscale(pipe, size, quality, profile, meta, input);
  }
  // photo
  const flatOpaque = await isAlphaFullyOpaque(input);
  let p = pipe;
  // Remove alpha ONLY when fully opaque (visually identical) or when flattening
  // onto white is requested implicitly by JPEG output over a white page.
  if (meta.hasAlpha || meta.channels === 4) {
    p = flatOpaque ? p.removeAlpha() : p.flatten({ background: '#ffffff' });
  }
  const out = await p.jpeg({ quality, mozjpeg: true, chromaSubsampling: profile.jpegSubsampling }).toBuffer();
  const m = await sharp(out).metadata();
  return { data: out, format: 'jpeg', width: m.width ?? size.width, height: m.height ?? size.height, kind };
}
