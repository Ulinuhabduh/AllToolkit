/** Shared synthetic fixtures — no external files needed. */
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function textPdf(pages = 2): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const p = doc.addPage([595.28, 841.89]);
    p.drawText(`Text-based document page ${i + 1}`, { x: 50, y: 780, size: 20, font });
    p.drawText('Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(8), {
      x: 50, y: 700, size: 11, font, maxWidth: 495, lineHeight: 14,
    });
    // vector graphics: bars + box (must survive compression as vectors)
    for (let b = 0; b < 12; b++) {
      p.drawRectangle({ x: 50 + b * 40, y: 200, width: 28, height: 40 + b * 12, color: rgb(0.2, 0.4, 0.8) });
    }
    p.drawRectangle({ x: 50, y: 120, width: 495, height: 40, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  }
  return Buffer.from(await doc.save({ useObjectStreams: true }));
}

/**
 * High-res continuous-tone JPEG: gradient sky + sun + mountains + ground.
 * Structured colour variation (like a real photo) that survives
 * quantization — unlike flat-colour fixtures which collapse to a handful
 * of colours and would mislead the classifier.
 */
export async function photoJpeg(width = 1600, height = 1200, quality = 95): Promise<Buffer> {
  const scene =
    `<svg width="${width}" height="${height}">` +
    `<defs>` +
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#1a3a6b"/><stop offset="0.5" stop-color="#4a90c2"/>` +
    `<stop offset="1" stop-color="#bcd86a"/></linearGradient>` +
    `<linearGradient id="mtn" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#5a5a6e"/><stop offset="1" stop-color="#2a2a35"/></linearGradient>` +
    `<radialGradient id="sun" cx="0.7" cy="0.3" r="0.45">` +
    `<stop offset="0" stop-color="#fff8d0"/><stop offset="1" stop-color="#fff8d0" stop-opacity="0"/>` +
    `</radialGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#sky)"/>` +
    `<ellipse cx="${width * 0.7}" cy="${height * 0.3}" rx="${width * 0.2}" ry="${width * 0.2}" fill="url(#sun)"/>` +
    `<polygon points="0,${height} ${width * 0.25},${height * 0.42} ${width * 0.5},${height}" fill="url(#mtn)"/>` +
    `<polygon points="${width * 0.31},${height} ${width * 0.62},${height * 0.5} ${width * 0.94},${height}" fill="#3a4a3f"/>` +
    `<polygon points="${width * 0.62},${height} ${width * 0.81},${height * 0.62} ${width},${height}" fill="url(#mtn)"/>` +
    `<rect y="${height * 0.875}" width="${width}" height="${height * 0.125}" fill="#2a4a2a"/>` +
    `</svg>`;
  return sharp(Buffer.from(scene)).jpeg({ quality }).toBuffer();
}

export async function imageHeavyPdf(pages = 3): Promise<Buffer> {
  const jpg = await photoJpeg();
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const img = await doc.embedJpg(jpg);
    const p = doc.addPage([600, 800]);
    p.drawImage(img, { x: 0, y: 0, width: 600, height: 800 });
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

/** Pure scan: one full-page image per page, no text layer. */
export async function scannedPdf(pages = 2): Promise<Buffer> {
  const jpg = await photoJpeg(1700, 2200, 92);
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const img = await doc.embedJpg(jpg);
    const p = doc.addPage([595.28, 841.89]);
    p.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

export async function grayscalePdf(): Promise<Buffer> {
  const photo = await photoJpeg(1200, 900, 90);
  const gray = await sharp(photo).greyscale().jpeg({ quality: 92 }).toBuffer();
  const doc = await PDFDocument.create();
  const img = await doc.embedJpg(gray);
  const p = doc.addPage([600, 700]);
  p.drawImage(img, { x: 0, y: 0, width: 600, height: 700 });
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

export async function mixedPdf(): Promise<Buffer> {
  const jpg = await photoJpeg(1000, 700, 90);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const img = await doc.embedJpg(jpg);
  const p = doc.addPage([595.28, 841.89]);
  p.drawText('Mixed document: text stays selectable', { x: 50, y: 790, size: 18, font });
  p.drawImage(img, { x: 50, y: 400, width: 495, height: 346 });
  p.drawText('Caption below the figure with vector underline.', { x: 50, y: 370, size: 12, font });
  return Buffer.from(await doc.save({ useObjectStreams: true }));
}

export async function tinyPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p = doc.addPage([300, 200]);
  p.drawText('tiny', { x: 20, y: 100, size: 14, font });
  return Buffer.from(await doc.save({ useObjectStreams: true }));
}

export function corruptPdf(): Buffer {
  return Buffer.from('%PDF-1.4 broken trailer xref garbage that never parses ' + 'x'.repeat(500));
}

export async function writeTemp(buf: Buffer, name = 'fixture.pdf'): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfc-test-'));
  const p = path.join(dir, `${randomUUID()}-${name}`);
  await fs.writeFile(p, buf);
  return p;
}

export async function flatPng(): Promise<Buffer> {
  // Diagram-like: white bg, few solid rectangles → lineart.
  const base = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .png()
    .toBuffer();
  const svg = `<svg width="800" height="600">
    <rect x="50" y="50" width="300" height="200" fill="red"/>
    <rect x="400" y="50" width="300" height="200" fill="blue"/>
    <rect x="50" y="300" width="650" height="200" fill="green"/></svg>`;
  return sharp(base).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
}

export async function monoPng(): Promise<Buffer> {
  const svg = `<svg width="800" height="1000">
    <rect width="800" height="1000" fill="white"/>
    <rect x="60" y="60" width="680" height="40" fill="black"/>
    <rect x="60" y="130" width="680" height="40" fill="black"/>
    <rect x="60" y="200" width="400" height="40" fill="black"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
