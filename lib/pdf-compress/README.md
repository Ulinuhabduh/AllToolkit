# PDF Compressor — production-ready engine (iLovePDF-style)

Server-side compression pipeline with 3 modes. Text layers and vector
graphics are preserved — pages are never blindly rasterized.

```
Input PDF
  → validate input (signature, size, readability)
  → analyze (images / text / vectors / fonts, scan detection)
  → Pass 1: structural optimize (qpdf object streams + flate)
  → Pass 2: Ghostscript re-distill (explicit per-profile DPI downsample)
  → Pass 2b: scan-rebuild (pure scans ONLY — sharp recompress at exact
             profile JPEG quality, rebuilt at original page sizes)
  → Pass 3: final qpdf squeeze of best candidate
  → Pass 4: validate every candidate (signature, loadable, same page
            count, qpdf --check) → keep smallest valid
  → never-larger rule (+1% min-saving threshold) → fallback to original
```

## Folder structure

```
lib/pdf-compress/
  types.ts                 shared types (profiles, analysis, results)
  compression-profiles.ts  the 3 modes — tune ONLY here
  exec.ts                  safe spawn wrapper (arg array, timeout, no shell)
  pdf-analyzer.ts          pre-compression analysis + scan detection
  image-optimizer.ts       sharp/libvips recompress (photo/JPEG, line-art/PNG,
                           mono/2-colour PNG, grayscale stays gray)
  ghostscript.ts           explicit-param GS wrapper (no -dPDFSETTINGS reliance)
  qpdf.ts                  structural wrapper (graceful when binary missing)
  pdf-optimizer.ts         multi-pass pipeline
  pdf-validator.ts         post-compression validation + fallback signal
  compression-service.ts   orchestrator (validate→analyze→passes→compare)
  store.ts                 15-min download store (TTL + lazy sweep)
  index.ts                 public barrel (swap engines here one day)
  __tests__/               unit + integration tests + synthetic fixtures
app/api/pdf/compress/
  route.ts                 POST multipart {file, mode} → JSON metrics
  download/route.ts        GET ?id=&filename= → application/pdf stream
```

## Requirements

| Dep | Local dev | Docker |
|---|---|---|
| Node.js 20 | ✅ | ✅ (image) |
| Ghostscript (`gs`) | ✅ required | ✅ installed |
| qpdf | optional (pass skipped) | ✅ installed |
| poppler-utils (`pdfimages`, `pdfinfo`) | optional (scan pass skipped) | ✅ installed |
| libvips | via `sharp` npm bundle | via `sharp` npm bundle |

```bash
npm install
npm run dev          # http://localhost:3000/pdf/compress
```

## Docker

```bash
docker compose up --build
# → http://localhost:3000/pdf/compress
```

## Compression profiles (`compression-profiles.ts`)

```ts
type CompressionMode = "extreme" | "recommended" | "less";

interface CompressionProfile {
  colorDpi: number;       // downsample target (never upscale)
  grayscaleDpi: number;
  monochromeDpi: number;  // 1-bit scans → CCITT Group 4 via Ghostscript
  jpegQuality: number;    // sharp scan-rebuild pass (35 / 60 / 82)
  jpegSubsampling?: string; // '4:2:0' extreme … '4:4:4' less
  removeMetadata: boolean;
  optimizeFonts: boolean; // subset + compress
  compressStreams: boolean;
}
```

| mode | color/gray DPI | mono DPI | JPEG q | character |
|---|---|---|---|---|
| `extreme` | 96 | 150 | 35 | smallest possible, still readable |
| `recommended` *(default)* | 144 | 200 | 60 | balanced, sharp for screen/office print |
| `less` | 180 | 300 | 82 | archive/print quality |

Downsampling rule: `source DPI ≤ target DPI → keep as-is` (Ghostscript
`DownsampleThreshold=1.0` + sharp `computeTargetSize` both enforce this).

## API

### `POST /api/pdf/compress`

Multipart upload: `file` (PDF, ≤ 50 MB) + `mode` (`extreme|recommended|less`,
default `recommended`).

```bash
curl -X POST http://localhost:3000/api/pdf/compress \
  -F "file=@Laporan-Kemajuan-1.pdf;type=application/pdf" \
  -F "mode=recommended"
```

Success response:

```json
{
  "success": true,
  "mode": "recommended",
  "originalSize": 24800000,
  "compressedSize": 6200000,
  "savedBytes": 18600000,
  "savedPercentage": 75.0,
  "pages": 18,
  "processingTimeMs": 4200,
  "fallback": false,
  "fallbackReason": null,
  "downloadUrl": "/api/pdf/compress/download?id=3f2c…&filename=compressed-recommended-Laporan-Kemajuan-1.pdf"
}
```

Error response (400/429/500):

```json
{ "success": false, "error": "File too large (62.4 MB). Limit is 50 MB." }
```

Notes:

- `fallback: true` means the original was returned (already optimal or
  saving < 1%) — `compressedSize === originalSize`, never larger.
- Password-protected PDFs are rejected with 400 (unlock first via PDF → Unlock).
- Rate limit: 30 requests / 5 min per IP (in-memory).

### `GET /api/pdf/compress/download?id=…&filename=….pdf`

Streams `application/pdf` as attachment. Files expire after 15 minutes
(`410 Gone` past TTL — just compress again).

```bash
curl -OJ "http://localhost:3000/api/pdf/compress/download?id=3f2c…&filename=out.pdf"
```

## Output metrics

```ts
savedBytes = originalSize - compressedSize;
savedPercentage = ((originalSize - compressedSize) / originalSize) * 100; // 1 decimal
```

## Security

- `spawn(binary, argsArray)` everywhere — user input never touches a shell.
- 50 MB input cap, 120 s Ghostscript timeout, 60 s qpdf timeout.
- Per-request isolated temp dir (`mkdtemp`), always removed; only the
  chosen output is kept under a random UUID in the store dir.
- Filenames sanitized (`sanitizeFilename`), download IDs strictly validated
  (`/^[a-f0-9-]{8,64}$/`) with store-dir containment check.
- PDF signature (`%PDF-`) + MIME + readability checks before processing.
- Temp files from Ghostscript/qpdf live inside the request temp dir.

## Testing

```bash
npm test   # vitest: unit (profiles, image kinds, analyzer, validator,
           #          metrics) + integration (service × 3 modes on
           #          text / scanned / image-heavy / gray / mono /
           #          mixed / optimal / corrupt / oversize fixtures)
```

Integration asserts for every case: `output valid ∧ page count same ∧
size ≤ original`. The `extreme` image-heavy case additionally asserts
>10% real saving (not metadata-only).

## Swapping the engine later

Only `lib/pdf-compress/index.ts` (barrel) and `compression-service.ts`
are imported by the API route — implement the same `compressPdfService`
signature with a different backend (e.g. a Rust/Go microservice) and
nothing else changes.
