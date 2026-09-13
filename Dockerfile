# AllToolkit + PDF Compressor engine
# Includes: Node.js, Ghostscript, qpdf, poppler-utils (pdfimages/pdfinfo).
# sharp (libvips) ships its own vendored libvips via npm — no apt package needed.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      ghostscript \
      qpdf \
      poppler-utils \
    && rm -rf /var/lib/apt/lists/* \
    && gs --version && qpdf --version

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
