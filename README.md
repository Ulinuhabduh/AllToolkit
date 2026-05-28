# AllTools — All-in-One Online Toolkit

A privacy-first platform that bundles 30+ free utilities (image, PDF, file converters, developer tools, text utilities) into a single Next.js app. Everything runs **client-side in the browser** — no files are uploaded to any server.

## ✨ Features

| Category | Tools |
|---|---|
| **Image** | Remove Background, Image Enhancer, Compressor, Format Converter, Resizer, Cropper, Watermark, Color Picker |
| **PDF** | Merge, Split, Compress, PDF → Image, Image → PDF, Unlock (with password), OCR |
| **File Converter** | Audio (MP3/WAV/OGG/M4A/FLAC), Video (MP4/WebM/GIF), Document (DOCX/MD/HTML/TXT) |
| **Developer** | JSON Formatter, Base64 Encoder/Decoder, Hash Generator (SHA family), Regex Tester, QR Code Generator, Diff Checker |
| **Text** | Markdown Preview, Case Converter, Word Counter, Lorem Ipsum |
| **Utility** | Password Generator, Color Tools (HEX/RGB/HSL), Unit Converter, Timezone Converter |

> 🔒 **Privacy by design**: all heavy processing (FFmpeg, Tesseract, ONNX background removal) loads at runtime from a CDN and runs inside your browser. Your files never leave your machine.

## 🧱 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router) + React 18 + TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with shadcn/ui–style primitives
- **Icons**: [Lucide React](https://lucide.dev/)
- **Theme**: `next-themes` (light / dark / system)
- **Processing libraries** (lazy-loaded per tool):
  - `pdf-lib`, `pdfjs-dist` — PDF read/write/render
  - `browser-image-compression` — image compression
  - `tesseract.js` — OCR
  - `mammoth`, `turndown`, `marked` — document conversion
  - `@ffmpeg/ffmpeg` (CDN) — audio/video conversion
  - `@imgly/background-removal` (CDN) — AI background removal
  - `qrcode`, `jspdf`, `jszip`, `diff` — misc

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20 ([nvm-windows](https://github.com/coreybutler/nvm-windows) recommended)
- **npm** ≥ 10 (bundled with Node 20)
- **Git**
- A modern browser (Chrome / Edge / Firefox)

### Install & run

```bash
# 1. Clone
git clone <your-repo-url> all-tools
cd all-tools

# 2. Install dependencies
npm install

# 3. Start dev server (hot reload at http://localhost:3000)
npm run dev
```

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with HMR on port 3000 |
| `npm run build` | Production build (typecheck + optimize) |
| `npm run start` | Run the built production app |
| `npm run lint` | ESLint check |
| `npx tsc --noEmit` | Type-check only (faster than build) |

## 📁 Project Structure

```
all-tools/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (theme, navbar, footer)
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Tailwind base + CSS variables
│   └── (tools)/                  # Route group for all tools
│       ├── image/<tool>/page.tsx
│       ├── pdf/<tool>/page.tsx
│       ├── convert/<tool>/page.tsx
│       ├── dev/<tool>/page.tsx
│       ├── text/<tool>/page.tsx
│       └── utility/<tool>/page.tsx
├── components/
│   ├── ui/                       # Reusable primitives (Button, Card, Input, …)
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── ToolGrid.tsx              # Landing-page grid with search
│   ├── ToolLayout.tsx            # Shared wrapper for every tool page
│   ├── FileDropzone.tsx          # Drag-and-drop file input
│   ├── ComingSoon.tsx            # Placeholder for WIP tools
│   └── theme-provider.tsx
├── lib/
│   ├── tools-registry.ts         # ★ Single source of truth for every tool
│   ├── utils.ts                  # cn(), formatBytes(), downloadBlob(), …
│   └── ffmpeg.ts                 # Shared FFmpeg loader (CDN)
├── public/
├── next.config.mjs               # Webpack & headers (COOP/COEP)
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 👥 Collaborating with Others

### Recommended Git workflow

We use a **feature-branch + PR review** flow on top of `main`.

```bash
# 1. Sync with main
git checkout main
git pull origin main

# 2. Create a feature branch (use a descriptive name)
git checkout -b feat/audio-trim-tool
# or:   fix/pdf-split-empty-range
# or:   chore/upgrade-tailwind

# 3. Code, commit small focused changes
git add app/(tools)/convert/audio-trim/page.tsx
git commit -m "feat(convert): add audio trim tool"

# 4. Push and open a Pull Request
git push -u origin feat/audio-trim-tool
# → open a PR on GitHub/GitLab, request review
```

**Commit message convention** ([Conventional Commits](https://www.conventionalcommits.org/)):

```
feat(scope): short summary       # new user-facing feature
fix(scope): what was broken      # bug fix
chore: tooling / non-user        # deps, config
docs: README / comments
refactor: no behavior change
```

Examples used in this repo:
- `feat(image): add color picker tool`
- `fix(pdf): handle empty range in split`
- `chore(deps): bump pdfjs-dist to 4.8.69`

### Branch protection rules (recommended for the repo owner)

On GitHub → Settings → Branches → add a rule for `main`:
- ✅ Require pull request before merging
- ✅ Require status checks to pass (CI build + typecheck)
- ✅ Require at least 1 approving review
- ✅ Dismiss stale reviews when new commits are pushed
- ❌ No direct pushes to `main`

### Splitting work without conflicts

The codebase is organized so that **each tool is fully self-contained** in its own folder. To minimize merge conflicts:

| If two devs work on… | Conflict risk |
|---|---|
| Different tool pages (`app/(tools)/image/x` vs `app/(tools)/pdf/y`) | 🟢 None |
| Same tool page | 🔴 High — coordinate first |
| `lib/tools-registry.ts` | 🟡 Low — small file, easy to resolve |
| `components/ui/*` shared primitives | 🟡 Coordinate, may affect everyone |
| `package.json` (deps) | 🟡 Resolve carefully, re-run `npm install` |

### Code-review checklist for PRs

Before requesting review, the author should confirm:

- [ ] `npm run build` passes locally (no errors, no new warnings)
- [ ] `npx tsc --noEmit` is clean
- [ ] New tool is registered in `lib/tools-registry.ts` with correct `status`
- [ ] Tool page uses `<ToolLayout slug="..." />`
- [ ] Heavy libs are loaded with **dynamic `import()`** (not top-level) — keeps the shared bundle small
- [ ] No hardcoded English-only strings if i18n was set up (currently single-language)
- [ ] No `console.log` left in production code
- [ ] Privacy guarantee preserved (no fetch to external servers with user data)

---

## ➕ How to Add a New Tool

A new tool is **three changes**:

### 1. Register it in [`lib/tools-registry.ts`](lib/tools-registry.ts)

```ts
import { Scissors } from 'lucide-react'; // pick an icon from lucide.dev

// add inside the tools[] array
{
  slug: 'image/background-blur',
  name: 'Background Blur',
  category: 'image',
  description: 'Blur the background of a portrait',
  icon: Scissors,
  status: 'beta',                 // 'ready' | 'beta' | 'soon'
  keywords: ['portrait', 'blur'], // optional, used by search
},
```

### 2. Create the page at `app/(tools)/<category>/<slug-suffix>/page.tsx`

Use this template:

```tsx
'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function BackgroundBlurPage() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <ToolLayout slug="image/background-blur">
      {!file ? (
        <FileDropzone accept="image/*" onFiles={(fs) => setFile(fs[0])} />
      ) : (
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* your tool UI here */}
            <Button onClick={() => setFile(null)}>New image</Button>
          </CardContent>
        </Card>
      )}
    </ToolLayout>
  );
}
```

### 3. (Optional) Add new deps via `npm install <package>`

If the tool needs a heavy library, **lazy-load it** inside the handler to keep the page bundle small:

```ts
async function handleProcess() {
  const heavyLib = await import('some-heavy-lib');  // ⬅ inside the handler
  // …
}
```

For libraries that don't play nicely with Webpack (e.g. CDN-only ESM), use the `webpackIgnore` hint:

```ts
const mod = await import(/* webpackIgnore: true */ 'https://esm.sh/some-pkg@1.0.0');
```

That's it. The new tool will automatically appear on the landing page grid and be searchable.

---

## 🏗 Production Build

```bash
npm run build
npm run start         # serves the production build on :3000
```

Deployment targets:

| Platform | Notes |
|---|---|
| **Vercel** | Zero-config — just import the repo. Recommended. |
| **Netlify** | Works with the Next.js plugin |
| **Self-host** | `npm run build && npm run start` behind nginx/Caddy |
| **Static export** | Not currently supported (some routes need runtime features). |

> ⚠️ If you deploy behind a proxy, make sure the `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers (set in `next.config.mjs`) are preserved — they're required for FFmpeg multithreading and SharedArrayBuffer.

## 🩺 Troubleshooting

### "webpack cache pack failed" warnings on Windows

```
[webpack.cache.PackFileCacheStrategy] Caching failed for pack: ENOENT …
```

Harmless. Caused by Windows Defender scanning `.next/cache` while webpack is writing. Fixes:

```powershell
# Clear cache
Remove-Item -Recurse -Force .next/cache

# Optional: exclude project from Defender (run PowerShell as admin)
Add-MpPreference -ExclusionPath "d:\path\to\all-tools"
```

### "EPERM: operation not permitted, open '.next/trace'"

A previous `next` process is still running. Stop it and clear:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force .next
```

### Tool button does nothing / silent failure

Open browser DevTools → Console. The CDN-loaded libraries (FFmpeg, background-removal) print clear errors if they fail to load (e.g. offline, blocked by adblock).

### Build fails after adding a dep

Some packages bundle Node-only files that Terser can't parse. Workaround: load them via CDN with `webpackIgnore: true` instead of npm. See `lib/ffmpeg.ts` for the pattern.

## 📜 License

MIT — see `LICENSE` if present, otherwise treat as MIT for now.

## 🤝 Acknowledgements

Built on the shoulders of giants — see the dependency list above. Special thanks to:

- [IMG.LY](https://img.ly/) for the open-source background removal model
- [Tesseract.js](https://tesseract.projectnaptha.com/) for in-browser OCR
- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) for media processing in the browser
- [shadcn/ui](https://ui.shadcn.com/) for the design primitives inspiration
