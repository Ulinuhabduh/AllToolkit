/**
 * pdf-compressor public barrel — swap engines here in the future
 * (e.g. a pure-Rust or cloud engine) without touching API/UI code.
 */
export * from './types';
export * from './compression-profiles';
export * from './compression-service';
export { analyzePdf } from './pdf-analyzer';
export { validateCompressedPdf } from './pdf-validator';
export { runGhostscript, buildGhostscriptArgs } from './ghostscript';
export { qpdfOptimize, qpdfCheck, qpdfAvailable } from './qpdf';
export { recompressImage, detectImageKind, computeTargetSize } from './image-optimizer';
export { storeDir, sweepStore, STORE_TTL_MS } from './store';
