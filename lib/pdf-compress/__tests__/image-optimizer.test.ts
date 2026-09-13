import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  computeTargetSize,
  detectImageKind,
  recompressImage,
} from '../image-optimizer';
import { getProfile } from '../compression-profiles';
import { flatPng, monoPng, photoJpeg } from './fixtures';

describe('computeTargetSize', () => {
  it('never upscales a low-DPI source', () => {
    // 400px on an 8.5in line ≈ 47 DPI — below any target.
    const r = computeTargetSize(400, 300, 612, 792, 144);
    expect(r.width).toBe(400);
    expect(r.height).toBe(300);
    expect(r.downsampled).toBe(false);
  });

  it('downsamples a high-DPI source to the target', () => {
    // 1700px across 8.27in ≈ 205 DPI → target 96.
    const r = computeTargetSize(1700, 2200, 595.28, 841.89, 96);
    expect(r.downsampled).toBe(true);
    const effDpi = r.width / (595.28 / 72);
    expect(effDpi).toBeGreaterThan(80);
    expect(effDpi).toBeLessThan(115);
  });

  it('clamps gigantic images to maxSidePx', () => {
    const r = computeTargetSize(8000, 8000, 595.28, 841.89, 300, 2000);
    expect(Math.max(r.width, r.height)).toBeLessThanOrEqual(2000);
  });
});

describe('detectImageKind', () => {
  it('classifies a noisy photo as photo', async () => {
    expect(await detectImageKind(await photoJpeg())).toBe('photo');
  });

  it('classifies flat-colour graphics as lineart (never forced to JPEG)', async () => {
    expect(await detectImageKind(await flatPng())).toBe('lineart');
  });

  it('classifies bilevel content as monochrome', async () => {
    expect(await detectImageKind(await monoPng())).toBe('monochrome');
  });

  it('classifies desaturated content as grayscale', async () => {
    const photo = await photoJpeg(1400, 1000, 90);
    const gray = await sharp(photo).greyscale().jpeg({ quality: 90 }).toBuffer();
    expect(await detectImageKind(gray)).toBe('grayscale');
  });
});

describe('recompressImage', () => {
  it('photo → JPEG, smaller at extreme quality than at less quality', async () => {
    const photo = await photoJpeg(1200, 900, 95);
    const lo = await recompressImage(photo, getProfile('extreme'), {
      targetDpi: 96, displayWidthPt: 600, displayHeightPt: 450,
    });
    const hi = await recompressImage(photo, getProfile('less'), {
      targetDpi: 180, displayWidthPt: 600, displayHeightPt: 450,
    });
    expect(lo.format).toBe('jpeg');
    expect(hi.format).toBe('jpeg');
    expect(lo.data.length).toBeLessThan(hi.data.length);
    expect(lo.data.length).toBeLessThan(photo.length);
  });

  it('lineart → PNG (no JPEG ringing artefacts)', async () => {
    const out = await recompressImage(await flatPng(), getProfile('extreme'));
    expect(out.format).toBe('png');
    expect(out.kind).toBe('lineart');
  });

  it('monochrome → 2-colour PNG, never JPEG', async () => {
    const out = await recompressImage(await monoPng(), getProfile('extreme'));
    expect(out.format).toBe('png');
    expect(out.kind).toBe('monochrome');
  });
});
