/**
 * Compression profiles — the only place where the 3 levels are defined.
 * Tune here; everything downstream (Ghostscript, sharp, pipeline) reads
 * these values. Baseline matches the product spec.
 */
import type { CompressionMode, CompressionProfile } from './types';

export const COMPRESSION_PROFILES: Record<CompressionMode, CompressionProfile> = {
  extreme: {
    colorDpi: 96,
    grayscaleDpi: 96,
    monochromeDpi: 150,
    jpegQuality: 35,
    jpegSubsampling: '4:2:0',
    removeMetadata: true,
    optimizeFonts: true,
    compressStreams: true,
    minSavingRatio: 0.01,
  },
  recommended: {
    colorDpi: 144,
    grayscaleDpi: 144,
    monochromeDpi: 200,
    jpegQuality: 60,
    jpegSubsampling: '4:2:0',
    removeMetadata: true,
    optimizeFonts: true,
    compressStreams: true,
    minSavingRatio: 0.01,
  },
  less: {
    colorDpi: 180,
    grayscaleDpi: 180,
    monochromeDpi: 300,
    jpegQuality: 82,
    jpegSubsampling: '4:4:4',
    removeMetadata: false,
    optimizeFonts: true,
    compressStreams: true,
    minSavingRatio: 0.01,
  },
};

export const DEFAULT_MODE: CompressionMode = 'recommended';

export function parseMode(raw: unknown): CompressionMode {
  if (raw === 'extreme' || raw === 'recommended' || raw === 'less') return raw;
  return DEFAULT_MODE;
}

export function getProfile(mode: CompressionMode): CompressionProfile {
  return COMPRESSION_PROFILES[mode];
}
