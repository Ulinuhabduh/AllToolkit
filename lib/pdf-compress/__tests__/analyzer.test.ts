import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzePdf } from '../pdf-analyzer';
import { grayscalePdf, imageHeavyPdf, mixedPdf, scannedPdf, textPdf, writeTemp } from './fixtures';

async function cleanup(p: string) {
  await fs.rm(path.dirname(p), { recursive: true, force: true }).catch(() => undefined);
}

describe('pdf-analyzer', () => {
  it('text PDF → pages counted, text/vector heavy, not a scan', async () => {
    const p = await writeTemp(await textPdf(2));
    try {
      const a = await analyzePdf(p);
      expect(a.pages).toBe(2);
      expect(a.isScanned).toBe(false);
      expect(a.textOps).toBeGreaterThan(0);
      expect(a.strategy).toContain('structural');
    } finally {
      await cleanup(p);
    }
  });

  it('image-heavy PDF → images found with real dimensions', async () => {
    const p = await writeTemp(await imageHeavyPdf(2));
    try {
      const a = await analyzePdf(p);
      expect(a.pages).toBe(2);
      expect(a.imageCount).toBeGreaterThanOrEqual(2);
      expect(a.images[0].width).toBeGreaterThan(500);
      expect(a.estimatedImageRatio).toBeGreaterThan(0.3);
    } finally {
      await cleanup(p);
    }
  });

  it('pure scan → isScanned with focus-images strategy', async () => {
    const p = await writeTemp(await scannedPdf(2));
    try {
      const a = await analyzePdf(p);
      expect(a.pages).toBe(2);
      expect(a.isScanned).toBe(true);
      expect(a.strategy).toBe('focus-images');
    } finally {
      await cleanup(p);
    }
  });

  it('grayscale + mixed PDFs parse without crashing', async () => {
    for (const buf of [await grayscalePdf(), await mixedPdf()]) {
      const p = await writeTemp(buf);
      try {
        const a = await analyzePdf(p);
        expect(a.pages).toBe(1);
        expect(a.imageCount).toBeGreaterThanOrEqual(1);
      } finally {
        await cleanup(p);
      }
    }
  });
});
