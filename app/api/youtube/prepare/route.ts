import { NextRequest, NextResponse } from 'next/server';
import { extractYouTubeId } from '@/lib/youtube-utils';
import { getJobsStore, cleanOldJobs, YouTubeJob } from '@/lib/youtube-jobs';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, type = 'video', quality = '720p', filename: customFilename } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing "url" parameter' }, { status: 400 });
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    cleanOldJobs();

    const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ext = type === 'audio' ? (quality === 'wav' ? 'wav' : quality === 'original' ? 'm4a' : 'mp3') : 'mp4';
    const filename = customFilename ? `${customFilename}.${ext}` : `youtube_${videoId}_${quality}.${ext}`;
    const mimeType = type === 'audio'
      ? (quality === 'wav' ? 'audio/wav' : quality === 'original' ? 'audio/mp4' : 'audio/mpeg')
      : 'video/mp4';

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const scratchDir = path.resolve('scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const tempPrefix = `yt_${jobId}`;
    const tempOutputFile = path.join(scratchDir, `${tempPrefix}.%(ext)s`);

    const ytDlpPath = path.resolve('bin/yt-dlp');

    const job: YouTubeJob = {
      id: jobId,
      url: standardUrl,
      type,
      quality,
      filename,
      ext,
      mimeType,
      status: 'starting',
      percent: 0,
      speed: '0 KB/s',
      eta: '--',
      totalSize: 'Calculating...',
      createdAt: Date.now(),
    };

    const store = getJobsStore();
    store.set(jobId, job);

    // Build arguments
    const args: string[] = [
      '--newline',
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

    // Spawn process asynchronously
    const proc = spawn(ytDlpPath, args);

    const parseProgressLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Match [download]  45.2% of 21.00MiB at 4.52MiB/s ETA 00:03
      const downloadMatch = trimmed.match(/\[download\]\s+([\d\.]+)%\s+of\s+([^\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/i);
      if (downloadMatch) {
        const pct = parseFloat(downloadMatch[1]);
        job.status = 'downloading';
        job.percent = Math.min(95, Math.round(pct));
        job.totalSize = downloadMatch[2];
        job.speed = downloadMatch[3];
        job.eta = downloadMatch[4];
        return;
      }

      // Match merging
      if (trimmed.includes('[Merger]') || trimmed.includes('Merging formats') || trimmed.includes('[ExtractAudio]')) {
        job.status = 'merging';
        job.percent = 96;
        job.speed = 'Finalizing...';
        job.eta = '00:01';
      }
    };

    proc.stdout.on('data', (d) => {
      const lines = d.toString().split('\n');
      for (const l of lines) parseProgressLine(l);
    });

    proc.stderr.on('data', (d) => {
      const lines = d.toString().split('\n');
      for (const l of lines) parseProgressLine(l);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const files = fs.readdirSync(scratchDir);
          const targetFile = files.find((f) => f.startsWith(tempPrefix));
          if (targetFile) {
            const fullFilePath = path.join(scratchDir, targetFile);
            const stat = fs.statSync(fullFilePath);
            job.status = 'ready';
            job.percent = 100;
            job.filePath = fullFilePath;
            job.fileSize = stat.size;
          } else {
            job.status = 'error';
            job.error = 'Downloaded file was not created on server.';
          }
        } catch (e: any) {
          job.status = 'error';
          job.error = e?.message || 'Error locating downloaded file.';
        }
      } else {
        job.status = 'error';
        job.error = `Download process exited with code ${code}`;
      }
    });

    proc.on('error', (err) => {
      job.status = 'error';
      job.error = err?.message || 'Failed to spawn download process.';
    });

    return NextResponse.json({
      success: true,
      jobId,
      filename,
    });
  } catch (err: any) {
    console.error('Prepare route error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to start download job' },
      { status: 500 }
    );
  }
}
