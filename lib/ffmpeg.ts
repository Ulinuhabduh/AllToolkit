'use client';

const FFMPEG_VERSION = '0.12.10';
const CORE_VERSION = '0.12.6';
const FFMPEG_URL = `https://esm.sh/@ffmpeg/ffmpeg@${FFMPEG_VERSION}`;
const UTIL_URL = `https://esm.sh/@ffmpeg/util@0.12.1`;
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpegInstance: any = null;
let loadingPromise: Promise<any> | null = null;

export async function getFFmpeg(
  onProgress?: (info: { progress: number; time: number }) => void,
  onLog?: (message: string) => void,
) {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const ffmpegMod: any = await import(/* webpackIgnore: true */ FFMPEG_URL);
    const utilMod: any = await import(/* webpackIgnore: true */ UTIL_URL);

    const FFmpegCtor = ffmpegMod.FFmpeg ?? ffmpegMod.default?.FFmpeg ?? ffmpegMod.default;
    const toBlobURL = utilMod.toBlobURL ?? utilMod.default?.toBlobURL;

    const ffmpeg = new FFmpegCtor();
    if (onLog) ffmpeg.on('log', ({ message }: any) => onLog(message));
    if (onProgress) ffmpeg.on('progress', (info: any) => onProgress(info));

    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadingPromise;
}

export async function fetchFileBytes(file: File | Blob): Promise<Uint8Array> {
  const utilMod: any = await import(/* webpackIgnore: true */ UTIL_URL);
  const fetchFile = utilMod.fetchFile ?? utilMod.default?.fetchFile;
  return fetchFile(file);
}
