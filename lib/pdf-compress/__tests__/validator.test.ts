import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateCompressedPdf } from '../pdf-validator';
import { corruptPdf, textPdf, writeTemp } from './fixtures';

async function cleanup(p: string) {
  await fs.rm(path.dirname(p), { recursive: true, force: true }).catch(() => undefined);
}

describe('pdf-validator', () => {
  it('accepts a healthy PDF with matching page count', async () => {
    const p = await writeTemp(await textPdf(3));
    try {
      const v = await validateCompressedPdf(p, p, 3);
      expect(v.valid).toBe(true);
      expect(v.pages).toBe(3);
    } finally {
      await cleanup(p);
    }
  });

  it('rejects empty output', async () => {
    const orig = await writeTemp(await textPdf(1), 'orig.pdf');
    const empty = path.join(path.dirname(orig), 'empty.pdf');
    await fs.writeFile(empty, Buffer.alloc(0));
    try {
      const v = await validateCompressedPdf(orig, empty, 1);
      expect(v.valid).toBe(false);
    } finally {
      await cleanup(orig);
    }
  });

  it('rejects non-PDF signature', async () => {
    const orig = await writeTemp(await textPdf(1), 'orig.pdf');
    const fake = path.join(path.dirname(orig), 'fake.pdf');
    await fs.writeFile(fake, Buffer.from('hello, not a pdf'));
    try {
      const v = await validateCompressedPdf(orig, fake, 1);
      expect(v.valid).toBe(false);
      expect(v.reason).toMatch(/signature|readable/i);
    } finally {
      await cleanup(orig);
    }
  });

  it('rejects page-count changes', async () => {
    const orig = await writeTemp(await textPdf(3), 'orig.pdf');
    const two = await writeTemp(await textPdf(2), 'two.pdf');
    try {
      const v = await validateCompressedPdf(orig, two, 3);
      expect(v.valid).toBe(false);
      expect(v.reason).toMatch(/page count/i);
    } finally {
      await cleanup(orig);
      await cleanup(two);
    }
  });

  it('rejects corrupt PDFs', async () => {
    const c = await writeTemp(corruptPdf(), 'corrupt.pdf');
    try {
      const v = await validateCompressedPdf(c, c, 1);
      expect(v.valid).toBe(false);
    } finally {
      await cleanup(c);
    }
  });
});
