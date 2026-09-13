import { describe, expect, it } from 'vitest';
import { buildMetrics, sanitizeFilename } from '../compression-service';

describe('metrics + filename hygiene', () => {
  it('computes savedBytes/savedPercentage (1 decimal)', () => {
    const m = buildMetrics(24_800_000, 6_200_000, 'recommended', 4200, 18);
    expect(m.savedBytes).toBe(18_600_000);
    expect(m.savedPercentage).toBe(75);
    expect(m.pages).toBe(18);
  });

  it('handles the spec example: 10.86MB → smaller', () => {
    const orig = Math.round(10.86 * 1024 * 1024);
    const comp = Math.round(1.9 * 1024 * 1024);
    const m = buildMetrics(orig, comp, 'extreme', 9000, 25);
    expect(m.savedPercentage).toBeGreaterThan(80);
    expect(m.savedBytes).toBe(orig - comp);
  });

  it('sanitizes hostile filenames (no traversal, keeps .pdf)', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd.pdf');
    expect(sanitizeFilename('Laporan Kemajuan- 1.pdf')).toMatch(/\.pdf$/);
    expect(sanitizeFilename('Laporan Kemajuan- 1.pdf')).not.toMatch(/[\s/\\]/);
    expect(sanitizeFilename('')).toBe('document.pdf');
  });
});
