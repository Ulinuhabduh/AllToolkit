/**
 * ghostscript wrapper — explicit distiller parameters per profile.
 *
 * Deliberately does NOT rely on `-dPDFSETTINGS=/screen|ebook|printer` alone:
 * every knob that matters (resolution, threshold, downsample filter, font
 * subsetting, stream compression, mono CCITT) is passed explicitly so the
 * three modes behave consistently across Ghostscript versions.
 *
 * Text layers and vector graphics are preserved — Ghostscript re-distills
 * images only; it does not rasterize pages.
 */
import type { CompressionProfile } from './types';
import { runBinary } from './exec';

export const GS_TIMEOUT_MS = 120_000;

export function buildGhostscriptArgs(
  inputPath: string,
  outputPath: string,
  profile: CompressionProfile
): string[] {
  const args: string[] = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.5',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    '-dSAFER',
    // Never upscale: threshold 1.0 downsamples only when source DPI exceeds
    // the target (default 1.5 would skip many real-world images).
    '-dDownsampleColorImages=true',
    `-dColorImageResolution=${profile.colorDpi}`,
    '-dColorImageDownsampleThreshold=1.0',
    '-dColorImageDownsampleType=/Bicubic',
    '-dDownsampleGrayImages=true',
    `-dGrayImageResolution=${profile.grayscaleDpi}`,
    '-dGrayImageDownsampleThreshold=1.0',
    '-dGrayImageDownsampleType=/Bicubic',
    // Monochrome scans → CCITT Group 4 (ideal for B/W text).
    '-dDownsampleMonoImages=true',
    `-dMonoImageResolution=${profile.monochromeDpi}`,
    '-dMonoImageDownsampleThreshold=1.0',
    '-dMonoImageDownsampleType=/Subsample',
    '-dEncodeColorImages=true',
    '-dEncodeGrayImages=true',
    '-dEncodeMonoImages=true',
    '-dAutoFilterColorImages=true',
    '-dAutoFilterGrayImages=true',
    '-dAutoFilterMonoImages=false',
    '-dMonoImageFilter=/CCITTFaxEncode',
    // Fonts / streams / structure
    '-dCompressPages=true',
    '-dUseFlateCompression=true',
    '-dDetectDuplicateImages=true',
  ];

  if (profile.optimizeFonts) {
    args.push('-dSubsetFonts=true', '-dCompressFonts=true', '-dEmbedAllFonts=true');
  } else {
    args.push('-dSubsetFonts=false');
  }

  // NOTE: JPEG quality tables inside pdfwrite are version-specific; the
  // profile's jpegQuality is honoured by the sharp scan-rebuild pass, while
  // Ghostscript contributes DPI-accurate, vector-preserving downsampling.
  // Keeping -c snippets out avoids cross-version PostScript failures.

  args.push(`-sOutputFile=${outputPath}`, inputPath);
  return args;
}

export async function runGhostscript(
  inputPath: string,
  outputPath: string,
  profile: CompressionProfile,
  timeoutMs = GS_TIMEOUT_MS
): Promise<{ stderr: string }> {
  const args = buildGhostscriptArgs(inputPath, outputPath, profile);
  const res = await runBinary('gs', args, { timeoutMs });
  if (res.code !== 0) {
    const detail = res.stderr.trim().slice(0, 2000);
    throw new Error(`Ghostscript failed (exit ${res.code}): ${detail || 'no stderr'}`);
  }
  return { stderr: res.stderr };
}
