import { describe, expect, it } from 'vitest';
import {
  COMPRESSION_PROFILES,
  DEFAULT_MODE,
  getProfile,
  parseMode,
} from '../compression-profiles';

describe('compression-profiles', () => {
  it('exposes exactly the 3 required modes', () => {
    expect(Object.keys(COMPRESSION_PROFILES).sort()).toEqual(['extreme', 'less', 'recommended']);
  });

  it('matches the spec baseline values', () => {
    expect(COMPRESSION_PROFILES.extreme).toMatchObject({
      colorDpi: 96, grayscaleDpi: 96, monochromeDpi: 150, jpegQuality: 35,
      removeMetadata: true, optimizeFonts: true, compressStreams: true,
    });
    expect(COMPRESSION_PROFILES.recommended).toMatchObject({
      colorDpi: 144, grayscaleDpi: 144, monochromeDpi: 200, jpegQuality: 60,
      removeMetadata: true, optimizeFonts: true, compressStreams: true,
    });
    expect(COMPRESSION_PROFILES.less).toMatchObject({
      colorDpi: 180, grayscaleDpi: 180, monochromeDpi: 300, jpegQuality: 82,
      removeMetadata: false, optimizeFonts: true, compressStreams: true,
    });
  });

  it('modes are strictly ordered: extreme < recommended < less (dpi & quality)', () => {
    const e = getProfile('extreme');
    const r = getProfile('recommended');
    const l = getProfile('less');
    expect(e.colorDpi).toBeLessThan(r.colorDpi);
    expect(r.colorDpi).toBeLessThan(l.colorDpi);
    expect(e.jpegQuality).toBeLessThan(r.jpegQuality);
    expect(r.jpegQuality).toBeLessThan(l.jpegQuality);
  });

  it('defaults to recommended and falls back on garbage input', () => {
    expect(DEFAULT_MODE).toBe('recommended');
    expect(parseMode('extreme')).toBe('extreme');
    expect(parseMode('less')).toBe('less');
    expect(parseMode('EBOOK' as never)).toBe('recommended');
    expect(parseMode(undefined)).toBe('recommended');
    expect(parseMode(null)).toBe('recommended');
  });
});
