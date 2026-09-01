import { NextRequest, NextResponse } from 'next/server';
import { extractYouTubeId } from '@/lib/youtube-utils';
import { getJobsStore } from '@/lib/youtube-jobs';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');

  // 1. Download prepared file by jobId
  if (jobId) {
    const store = getJobsStore();
    const job = store.get(jobId);

    if (!job || !job.filePath || !fs.existsSync(job.filePath)) {
      return NextResponse.json({ error: 'Job file not found or expired' }, { status: 404 });
    }

    const fullFilePath = job.filePath;
    const fileStat = fs.statSync(fullFilePath);
    const fileStream = fs.createReadStream(fullFilePath);

    fileStream.on('close', () => {
      try {
        if (fs.existsSync(fullFilePath)) {
          fs.unlinkSync(fullFilePath);
        }
        store.delete(jobId);
      } catch (e) {
        console.error('Error cleaning up job file:', e);
      }
    });

    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        fileStream.on('end', () => {
          controller.close();
        });
        fileStream.on('error', (err) => {
          controller.error(err);
        });
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': job.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(job.filename)}"; filename*=UTF-8''${encodeURIComponent(job.filename)}`,
        'Content-Length': fileStat.size.toString(),
        'Access-Control-Expose-Headers': 'Content-Length, Content-Disposition',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  // 2. Direct on-demand stream by URL fallback
  const url = req.nextUrl.searchParams.get('url');
  const type = req.nextUrl.searchParams.get('type') || 'video';
  const quality = req.nextUrl.searchParams.get('quality') || (type === 'audio' ? '192kbps' : '720p');
  const customFilename = req.nextUrl.searchParams.get('filename');

  if (!url) {
    return NextResponse.json({ error: 'Missing "url" or "jobId" parameter' }, { status: 400 });
  }

  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const ext = type === 'audio' ? (quality === 'wav' ? 'wav' : quality === 'original' ? 'm4a' : 'mp3') : 'mp4';
  const filename = customFilename ? `${customFilename}.${ext}` : `youtube_${videoId}_${quality}.${ext}`;
  const mimeType = type === 'audio'
    ? (quality === 'wav' ? 'audio/wav' : quality === 'original' ? 'audio/mp4' : 'audio/mpeg')
    : 'video/mp4';

  const ytDlpPath = path.resolve('bin/yt-dlp');
  const scratchDir = path.resolve('scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const tempPrefix = `yt_direct_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tempOutputFile = path.join(scratchDir, `${tempPrefix}.%(ext)s`);

  const args: string[] = [
    '--no-playlist',
    '--no-warnings',
    '--js-runtimes', 'node:node',
  ];

  if (type === 'audio') {
    if (quality === 'wav') {
      args.push('-x', '--audio-format', 'wav');
    } else if (quality === 'original' || quality === 'm4a') {
      args.push('-f', 'bestaudio[ext=m4a]/bestaudio/best');
    } else {
      const audioQuality = quality === '320kbps' ? '0' : quality === '192kbps' ? '2' : '5';
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', audioQuality);
    }
  } else {
    let maxH = '720';
    if (quality === '1080p') maxH = '1080';
    else if (quality === '480p') maxH = '480';
    else if (quality === '360p') maxH = '360';

    args.push(
      '-f', `bestvideo[height<=${maxH}]+bestaudio/best[height<=${maxH}]/best`,
      '--merge-output-format', 'mp4'
    );
  }

  args.push('-o', tempOutputFile, standardUrl);

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ytDlpPath, args);
      let stderrData = '';

      proc.stderr.on('data', (d) => {
        stderrData += d.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Download failed with code ${code}`));
      });

      proc.on('error', (err) => reject(err));
    });

    const files = fs.readdirSync(scratchDir);
    const targetFile = files.find((f) => f.startsWith(tempPrefix));

    if (!targetFile) {
      throw new Error('Downloaded file not found on server');
    }

    const fullFilePath = path.join(scratchDir, targetFile);
    const fileStat = fs.statSync(fullFilePath);
    const fileStream = fs.createReadStream(fullFilePath);

    fileStream.on('close', () => {
      try {
        if (fs.existsSync(fullFilePath)) {
          fs.unlinkSync(fullFilePath);
        }
      } catch (e) {
        console.error('Error cleaning up temp file:', e);
      }
    });

    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': fileStat.size.toString(),
        'Access-Control-Expose-Headers': 'Content-Length, Content-Disposition',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Download route error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to download YouTube media' },
      { status: 500 }
    );
  }
}
