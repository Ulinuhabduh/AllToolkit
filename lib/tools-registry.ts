import {
  Eraser, Wand2, FileImage, Crop, Maximize2, Droplets, Pipette,
  Combine, Scissors, FileDown, FileUp, Unlock, ScanText,
  Music2, Film, FileText,
  Braces, Binary, Hash, Regex, QrCode, GitCompare, Type, ListOrdered, Pilcrow,
  KeyRound, Palette, Ruler, Globe2,
  Image as ImageIcon, FileType2, Wrench, Code2, BookText,
  LucideIcon,
} from 'lucide-react';

export type ToolCategory = 'image' | 'pdf' | 'convert' | 'dev' | 'text' | 'utility';

export interface Tool {
  slug: string;
  name: string;
  category: ToolCategory;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
  /** server | client */
  engine?: 'client' | 'server' | 'hybrid';
  status?: 'ready' | 'beta' | 'soon';
}

export const categories: Record<ToolCategory, { name: string; icon: LucideIcon; color: string; description: string }> = {
  image: { name: 'Image Tools', icon: ImageIcon, color: 'from-pink-500 to-rose-500', description: 'Edit, convert & enhance images' },
  pdf: { name: 'PDF Tools', icon: FileType2, color: 'from-red-500 to-orange-500', description: 'Manage & convert PDF files' },
  convert: { name: 'File Converter', icon: Wrench, color: 'from-amber-500 to-yellow-500', description: 'Convert audio, video & documents' },
  dev: { name: 'Developer Tools', icon: Code2, color: 'from-emerald-500 to-teal-500', description: 'JSON, Base64, Regex & more' },
  text: { name: 'Text Tools', icon: BookText, color: 'from-sky-500 to-blue-500', description: 'Format, count & transform text' },
  utility: { name: 'Utilities', icon: Wrench, color: 'from-violet-500 to-purple-500', description: 'Passwords, colors & converters' },
};

export const tools: Tool[] = [
  // ─── Image ───
  { slug: 'image/remove-bg', name: 'Remove Background', category: 'image', description: 'Automatically remove image background (AI, in-browser)', icon: Eraser, keywords: ['bg', 'transparent', 'cutout'], status: 'beta' },
  { slug: 'image/enhance', name: 'Image Enhancer', category: 'image', description: 'Upscale & sharpen images', icon: Wand2, keywords: ['upscale', 'sharpen'], status: 'beta' },
  { slug: 'image/compress', name: 'Image Compressor', category: 'image', description: 'Reduce file size without losing quality', icon: FileDown, keywords: ['optimize', 'smaller'], status: 'ready' },
  { slug: 'image/convert', name: 'Image Converter', category: 'image', description: 'Convert PNG, JPG, WebP, AVIF, and more', icon: FileImage, keywords: ['format'], status: 'ready' },
  { slug: 'image/resize', name: 'Image Resizer', category: 'image', description: 'Change image dimensions', icon: Maximize2, keywords: ['scale', 'dimensions'], status: 'ready' },
  { slug: 'image/crop', name: 'Image Cropper', category: 'image', description: 'Crop images to any size', icon: Crop, status: 'ready' },
  { slug: 'image/watermark', name: 'Watermark', category: 'image', description: 'Add text watermark to images', icon: Droplets, status: 'ready' },
  { slug: 'image/color-picker', name: 'Color Picker', category: 'image', description: 'Pick colors from an image', icon: Pipette, status: 'ready' },

  // ─── PDF ───
  { slug: 'pdf/merge', name: 'Merge PDF', category: 'pdf', description: 'Combine multiple PDFs into one', icon: Combine, status: 'ready' },
  { slug: 'pdf/split', name: 'Split PDF', category: 'pdf', description: 'Split PDF into separate pages', icon: Scissors, status: 'ready' },
  { slug: 'pdf/compress', name: 'Compress PDF', category: 'pdf', description: 'Reduce PDF file size', icon: FileDown, status: 'ready' },
  { slug: 'pdf/to-image', name: 'PDF to Image', category: 'pdf', description: 'Convert PDF pages to PNG/JPG', icon: FileImage, status: 'beta' },
  { slug: 'pdf/from-image', name: 'Image to PDF', category: 'pdf', description: 'Convert images to PDF', icon: FileUp, status: 'ready' },
  { slug: 'pdf/unlock', name: 'Unlock PDF', category: 'pdf', description: 'Remove password from PDF (if you know the password)', icon: Unlock, status: 'beta' },
  { slug: 'pdf/ocr', name: 'PDF OCR', category: 'pdf', description: 'Extract text from PDF or image', icon: ScanText, status: 'beta' },

  // ─── Convert ───
  { slug: 'convert/audio', name: 'Audio Converter', category: 'convert', description: 'MP3, WAV, FLAC, M4A, OGG', icon: Music2, status: 'beta' },
  { slug: 'convert/video', name: 'Video Converter', category: 'convert', description: 'MP4, WebM, GIF, extract audio', icon: Film, status: 'beta' },
  { slug: 'convert/document', name: 'Document Converter', category: 'convert', description: 'DOCX, TXT, MD, HTML', icon: FileText, status: 'ready' },

  // ─── Dev ───
  { slug: 'dev/json', name: 'JSON Formatter', category: 'dev', description: 'Format, minify & validate JSON', icon: Braces, status: 'ready' },
  { slug: 'dev/base64', name: 'Base64 Encoder/Decoder', category: 'dev', description: 'Encode/decode Base64 (text & file)', icon: Binary, status: 'ready' },
  { slug: 'dev/hash', name: 'Hash Generator', category: 'dev', description: 'SHA-1, SHA-256, SHA-384, SHA-512', icon: Hash, status: 'ready' },
  { slug: 'dev/regex', name: 'Regex Tester', category: 'dev', description: 'Test regular expressions live', icon: Regex, status: 'ready' },
  { slug: 'dev/qr', name: 'QR Code Generator', category: 'dev', description: 'Generate QR codes from text/URL', icon: QrCode, status: 'ready' },
  { slug: 'dev/diff', name: 'Diff Checker', category: 'dev', description: 'Compare two pieces of text', icon: GitCompare, status: 'ready' },

  // ─── Text ───
  { slug: 'text/markdown', name: 'Markdown Preview', category: 'text', description: 'Markdown → HTML live preview', icon: Type, status: 'ready' },
  { slug: 'text/case', name: 'Case Converter', category: 'text', description: 'UPPER, lower, Title, camelCase, snake_case', icon: Type, status: 'ready' },
  { slug: 'text/word-count', name: 'Word Counter', category: 'text', description: 'Count words, characters & lines', icon: ListOrdered, status: 'ready' },
  { slug: 'text/lorem', name: 'Lorem Ipsum', category: 'text', description: 'Generate placeholder text', icon: Pilcrow, status: 'ready' },

  // ─── Utility ───
  { slug: 'utility/password', name: 'Password Generator', category: 'utility', description: 'Generate secure random passwords', icon: KeyRound, status: 'ready' },
  { slug: 'utility/color', name: 'Color Tools', category: 'utility', description: 'HEX, RGB, HSL converter & palette', icon: Palette, status: 'ready' },
  { slug: 'utility/unit', name: 'Unit Converter', category: 'utility', description: 'Length, weight, temperature, and more', icon: Ruler, status: 'ready' },
  { slug: 'utility/timezone', name: 'Timezone Converter', category: 'utility', description: 'Convert time across timezones', icon: Globe2, status: 'ready' },
];

export const toolsByCategory = (cat: ToolCategory) => tools.filter((t) => t.category === cat);
export const getTool = (slug: string) => tools.find((t) => t.slug === slug);
export const searchTools = (query: string): Tool[] => {
  const q = query.toLowerCase().trim();
  if (!q) return tools;
  return tools.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.keywords ?? []).some((k) => k.toLowerCase().includes(q))
  );
};
