/**
 * pdf-compressor — shared types.
 * Engine is modular: analyzer / optimizer / validator can be swapped
 * without touching the service or API layers.
 */

export type CompressionMode = 'extreme' | 'recommended' | 'less';

export interface CompressionProfile {
  /** Target DPI for color images (downsample only, never upscale). */
  colorDpi: number;
  /** Target DPI for grayscale images. */
  grayscaleDpi: number;
  /** Target DPI for monochrome (1-bit) images. */
  monochromeDpi: number;
  /** JPEG quality 1-100 used by the sharp-based image pass. */
  jpegQuality: number;
  /**
   * Chroma subsampling for JPEG encode.
   * '4:2:0' = smallest (extreme), '4:4:4' = best quality (less).
   */
  jpegSubsampling: '4:2:0' | '4:2:2' | '4:4:4';
  removeMetadata: boolean;
  optimizeFonts: boolean;
  compressStreams: boolean;
  /** Minimum useful saving ratio (e.g. 0.01 = 1%). Below this → fallback to original. */
  minSavingRatio: number;
}

export type ImageKind = 'photo' | 'lineart' | 'grayscale' | 'monochrome';

export interface PdfImageInfo {
  width: number;
  height: number;
  bitsPerComponent: number;
  colorSpace: string;
  filters: string[];
  byteLength: number;
  /** Effective DPI relative to the page it is drawn on (approx). */
  effectiveDpi: number;
}

export interface PdfAnalysis {
  pages: number;
  fileSize: number;
  imageCount: number;
  imageBytes: number;
  images: PdfImageInfo[];
  textOps: number;
  fontCount: number;
  vectorOps: number;
  /** imageBytes / fileSize, 0..1 */
  estimatedImageRatio: number;
  hasTransparency: boolean;
  hasForms: boolean;
  encrypted: boolean;
  /** Heuristic: every page is basically one big full-page image. */
  isScanned: boolean;
  isImageHeavy: boolean;
  isTextVectorHeavy: boolean;
  strategy: 'focus-images' | 'balanced' | 'structural-only';
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  /** 0..100, rounded to 1 decimal */
  savedPercentage: number;
  mode: CompressionMode;
  processingTimeMs: number;
  pages: number;
  success: boolean;
  /** true when output fell back to the original file */
  fallback: boolean;
  fallbackReason?: string;
}

export interface ValidatedCandidate {
  path: string;
  size: number;
  pages: number;
  label: string;
}
