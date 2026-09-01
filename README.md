# AllTools — All-in-One Online Toolkit & Privacy-First Media Suite

<p align="center">
  <img src="public/logo.png" width="90" height="90" alt="AllTools Logo" />
</p>

<p align="center">
  <b>A modern, privacy-first platform bundling 35+ free, high-performance web utilities into a single Next.js application.</b><br />
  Featuring frosted Glassmorphism UI, client-side WebAssembly computation, and native real-time media streaming.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-emerald?style=flat-square" alt="License" />
</p>

---

## 🌟 Overview

**AllTools** is designed with a **privacy-first and speed-first philosophy**. Most file operations (PDF editing, image background removal, compression, OCR, and document conversions) run **100% client-side in the browser** using WebAssembly (FFmpeg, Tesseract, ONNX). Your confidential files and documents never leave your device.

For streaming tasks such as the **YouTube Downloader**, AllTools utilizes a high-performance **native `yt-dlp` stream engine** with real-time job progress polling (speed, percentage, ETA) and instant file delivery without third-party redirects or ads.

---

## ✨ Features & Tool Catalog

### 📄 PDF Toolkit
Comprehensive suite for viewing, manipulating, and editing PDF documents directly in the browser:
- **Edit PDF**: Full-featured in-browser PDF editor. Add custom text, draw with pen/brush, highlight, draw shapes, insert images/stamps, signature pad (draw/type), whiteout/redact, add watermarks, and reorder/rotate/delete pages.
- **Merge PDF**: Combine multiple PDFs into a single document with drag-and-drop ordering, page count calculation, and custom per-file page ranges (e.g. `1, 3-5`).
- **Cut / Remove Pages**: Visual PDF page gallery with dual modes (*Delete Selected* or *Extract / Keep Selected*), rotation per page, and batch selectors (*All / None / Odd / Even / Invert*).
- **Split PDF**: Split documents using 4 flexible modes: Custom Page Ranges, Every N Pages, Extract All Single Pages, or Visual Selection into standalone PDFs or a `.zip` archive.
- **Compress PDF**: Optimize and shrink PDF file size.
- **PDF to Image**: Render high-resolution PDF pages into PNG / JPG images.
- **Image to PDF**: Convert photos and scanned documents into standardized PDF files.
- **Unlock PDF**: Strip passwords and security restrictions from unlocked PDFs.
- **PDF OCR**: Extract editable text from scanned PDFs and document images using client-side Tesseract OCR.

---

### 🎥 Media & File Converters
- **YouTube Downloader**: High-speed downloader supporting YouTube Videos, Shorts, and Music links:
  - **Video (MP4)**: `1080p Full HD`, `720p HD`, `480p SD`, and `360p`.
  - **Audio & Music (MP3 / M4A / WAV)**: `MP3 320 kbps` (Extreme Quality), `MP3 192 kbps`, `MP3 128 kbps`, `M4A (AAC)`, and lossless `WAV`.
  - **Cover Art / Thumbnail**: Direct download of `1080p MaxRes` and `720p HQ` `.jpg` images.
  - **Real-Time Progress**: Live tracking displaying byte progress, transfer speed (`⚡ MB/s`), and ETA (`⏱️`).
  - **Privacy & Clean Experience**: 100% direct in-browser file delivery with zero third-party ads or external redirects.
- **Audio Converter**: Convert audio between MP3, WAV, FLAC, M4A, and OGG formats using FFmpeg WASM.
- **Video Converter**: Transcode videos between MP4, WebM, and GIF, or extract audio tracks.
- **Document Converter**: Convert documents between DOCX, Markdown, HTML, and TXT formats.

---

### 🖼️ Image Utilities
- **Remove Background**: AI-driven background removal running client-side with ONNX models.
- **Image Enhancer**: Sharpen, upscale, and enhance image clarity.
- **Image Compressor**: Reduce PNG, JPG, and WebP file sizes with customizable quality thresholds.
- **Image Format Converter**: Batch convert images between PNG, JPG, WebP, AVIF, BMP, and GIF.
- **Image Resizer**: Adjust pixel dimensions and aspect ratios with instant preview.
- **Image Cropper**: Interactive aspect ratio cropping with preset crop sizes (1:1, 16:9, 4:3, etc.).
- **Watermark Tool**: Stamp custom text or image watermarks with opacity and position controls.
- **Color Picker**: Extract dominant palette colors and hex values from uploaded images.
- **ID Photo Maker**: Crop and resize photos for official document standards (Passport, Visa, KTP, SIM).

---

### 🎨 Design & Business Generators
- **Business Card Generator**: Design and export print-ready corporate and personal business cards.
- **Certificate Maker**: Create completion and achievement certificates with custom signatures.
- **Email Signature Generator**: Generate HTML email signatures compatible with Gmail, Outlook, and Apple Mail.
- **Invoice Generator**: Create detailed invoices with tax calculations, itemization, and PDF export.
- **Letterhead Generator**: Professional company letterhead templates with custom branding.
- **Receipt Maker**: Generate official payment receipts with serial numbers and item totals.

---

### 💻 Developer & Text Tools
- **JSON Formatter & Validator**: Format, minify, validate, and inspect JSON structures.
- **Base64 Encoder / Decoder**: Encode and decode raw text and binary files.
- **Hash Generator**: Compute cryptographic hashes (SHA-1, SHA-256, SHA-384, SHA-512, MD5).
- **Regex Tester**: Interactive regular expression tester with live match highlighting and regex cheatsheet.
- **QR Code Generator**: Generate customizable QR codes from URLs, Wi-Fi credentials, and text with logo embedding.
- **Diff Checker**: Side-by-side and inline text difference comparison.
- **Markdown Previewer**: Live split-pane Markdown editor with rendered HTML output.
- **Case Converter**: Convert text to UPPERCASE, lowercase, Title Case, camelCase, snake_case, kebab-case, and PascalCase.
- **Word Counter**: Live word, character, sentence, paragraph, and reading time counter.
- **Lorem Ipsum Generator**: Customizable placeholder text generator by paragraphs, sentences, or words.

---

### 🛠️ General Utilities
- **Password Generator**: Cryptographically secure random password generator with entropy meters.
- **Color Palette & Converter**: Convert between HEX, RGB, HSL, and HSV with harmonic palette suggestions.
- **Currency Converter**: Live currency exchange rate calculator with historical trends.
- **Timezone Converter**: Interactive world clock and timezone meeting planner.
- **Unit Converter**: Convert length, mass, temperature, area, volume, and digital storage units.

---

## 🎨 Design & User Experience (UX)

AllTools features a modern **Frosted Glassmorphism** design system:
- **Typography**: Clean, readable sans-serif typography powered by Google Font [`Plus Jakarta Sans`](https://fonts.google.com/specimen/Plus+Jakarta+Sans).
- **Ambient Glowing Lighting**: Subtle floating background orbs with smooth CSS keyframe animations (`float-slow`, `float-reverse`).
- **Interactive Category Filtering**: Category filter pills with live tool count badges and instant search filtering.
- **Favorites & Bookmarking System**: Save frequently used tools to a dedicated **Favorites** tab persisted via `localStorage`.
- **Responsive Layout**: Fluid experience across mobile, tablet, and ultra-wide desktop monitors.
- **Dark & Light Mode**: Seamless theme switching with persistent user preference.

---

## 🧱 Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Core Framework** | [Next.js 14](https://nextjs.org/) (App Router) + React 18 + TypeScript 5.6 |
| **Styling & Design** | [Tailwind CSS 3.4](https://tailwindcss.com/) + Custom Glassmorphism Tokens |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **PDF Processing** | [`pdf-lib`](https://pdf-lib.js.org/) & [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) |
| **Media Processing** | Standalone [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) + [`ffmpeg`](https://ffmpeg.org/) (Serverless & Client WASM) |
| **OCR & AI** | [`tesseract.js`](https://tesseract.projectnaptha.com/) + [`@imgly/background-removal`](https://img.ly/) |
| **Document Processing** | `mammoth`, `turndown`, `marked`, `jspdf`, `jszip` |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or later (LTS recommended)
- **npm**: `v10.x` or later (or `pnpm` / `yarn`)
- **Git**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/AllToolkit.git
cd AllToolkit

# 2. Install dependencies
npm install

# 3. Ensure the yt-dlp binary is executable (for Linux / macOS)
chmod +x bin/yt-dlp

# 4. Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server with Hot Module Replacement (HMR) on port `3000` |
| `npm run build` | Compiles the production build, runs strict TypeScript checks, and optimizes pages |
| `npm run start` | Serves the optimized production build |
| `npm run lint` | Runs ESLint to check for code quality and syntax errors |
| `npx tsc --noEmit` | Runs a standalone TypeScript type-check without generating output files |

---

## 📂 Project Architecture & Directory Map

```
AllToolkit/
├── app/
│   ├── (tools)/                  # Modular tool pages grouped by category
│   │   ├── convert/              # Media & document conversion (YouTube, Audio, Video, Doc)
│   │   ├── design/               # Business & design generators (Invoice, Card, Certificate)
│   │   ├── dev/                  # Developer utilities (JSON, Base64, Hash, Regex, QR)
│   │   ├── image/                # Image editing & AI tools (Remove BG, Compress, Crop, ID)
│   │   ├── pdf/                  # PDF suite (Edit, Merge, Cut, Split, OCR, Compress)
│   │   ├── text/                 # Text manipulation (Markdown, Case, Word Count)
│   │   └── utility/              # Everyday utilities (Password, Color, Currency, Unit)
│   ├── api/                      # Serverless API routes
│   │   ├── currency/             # Live exchange rates endpoint
│   │   └── youtube/              # YouTube download architecture
│   │       ├── info/             # Video metadata & thumbnail resolver
│   │       ├── prepare/          # Background download job starter
│   │       ├── progress/         # Real-time progress tracker
│   │       └── download/         # Binary media streaming & file delivery
│   ├── globals.css               # Glassmorphism tokens, gradients, and custom scrollbars
│   ├── layout.tsx                # Root layout with font configuration & ambient orbs
│   └── page.tsx                  # Home landing page with ToolGrid & search
├── bin/
│   └── yt-dlp                    # Standalone high-performance yt-dlp binary
├── components/
│   ├── ui/                       # Reusable UI primitives (Button, Card, Input, Badge, etc.)
│   ├── FileDropzone.tsx          # Frosted drag-and-drop file upload zone
│   ├── Navbar.tsx                # Sticky glassmorphism navigation header
│   ├── Footer.tsx                # Categorized footer links
│   ├── ToolGrid.tsx              # Dynamic search, category tabs, and favorite bookmarks
│   └── ToolLayout.tsx            # Unified wrapper for all tool pages
├── lib/
│   ├── tools-registry.ts         # Central registry & metadata for all tools
│   ├── pdf-utils.ts              # PDF rendering, range parsing, and canvas helpers
│   ├── youtube-utils.ts          # YouTube URL parsing and ID extraction
│   ├── youtube-jobs.ts           # In-memory progress tracking store
│   ├── ffmpeg.ts                 # In-browser WebAssembly FFmpeg loader
│   └── utils.ts                  # Shared utility functions (cn, formatBytes, downloadBlob)
├── public/                       # Static public assets
├── tailwind.config.ts            # Tailwind configuration (Glass shadows, custom keyframes)
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## ➕ Adding a New Tool

Adding a new tool to AllTools is structured into 3 straightforward steps:

### 1. Register the Tool in [`lib/tools-registry.ts`](lib/tools-registry.ts)
Add your tool definition to the `tools` array:

```ts
import { Sparkles } from 'lucide-react';

{
  slug: 'image/photo-filter',
  name: 'Photo Filter',
  category: 'image',
  description: 'Apply vintage, cinematic, and modern filters to images',
  icon: Sparkles,
  status: 'ready',                      // 'ready' | 'beta' | 'soon'
  keywords: ['filter', 'effects', 'photo'],
}
```

### 2. Create the Tool Page
Create `app/(tools)/image/photo-filter/page.tsx` using the standard `<ToolLayout>`:

```tsx
'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PhotoFilterPage() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <ToolLayout slug="image/photo-filter">
      {!file ? (
        <FileDropzone accept="image/*" onFiles={(fs) => setFile(fs[0])} />
      ) : (
        <Card className="glass-panel">
          <CardContent className="p-6 space-y-4">
            {/* Tool implementation */}
            <Button onClick={() => setFile(null)}>Reset</Button>
          </CardContent>
        </Card>
      )}
    </ToolLayout>
  );
}
```

### 3. Verify Build
Run the TypeScript compiler and build command:
```bash
npm run build
```
Your tool will automatically appear in the landing page catalog, category tabs, and search bar.

---

## 🔒 Privacy & Security

AllTools is designed with strict security standards:
- **No Third-Party Tracking**: Zero tracking pixels, user telemetry, or third-party cookies.
- **Client-Side Processing**: PDF files, images, OCR scans, and sensitive documents are processed purely in your browser memory.
- **Auto-Cleanup**: Temporary server processing files (for YouTube media streams) are immediately deleted from disk once delivered to the browser.
- **Cross-Origin Isolation**: Configured with `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers to support WebAssembly multithreading securely.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the Project repository.
2. Create your Feature Branch:
   ```bash
   git checkout -b feat/amazing-new-tool
   ```
3. Commit your Changes following [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(pdf): add new interactive annotation tool"
   ```
4. Push to the Branch:
   ```bash
   git push origin feat/amazing-new-tool
   ```
5. Open a Pull Request for review.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Crafted with ❤️ by the <b>AllTools Team</b>.
</p>
