'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';
import { getFFmpeg, fetchFileBytes } from '@/lib/ffmpeg';

const FORMATS = [
  { ext: 'mp4', mime: 'video/mp4', args: ['-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k'] },
  { ext: 'webm', mime: 'video/webm', args: ['-c:v', 'libvpx', '-b:v', '1M', '-c:a', 'libvorbis'] },
  { ext: 'gif', mime: 'image/gif', args: ['-vf', 'fps=12,scale=480:-1:flags=lanczos', '-loop', '0'] },
  { ext: 'mp3', mime: 'audio/mpeg', args: ['-vn', '-c:a', 'libmp3lame', '-q:a', '4'] },
];

export default function VideoConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState(FORMATS[0]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<Blob | null>(null);

  async function handleConvert() {
    if (!file) return;
    setLoading(true);
    setProgress(0);
    setResult(null);
    setStage('Loading FFmpeg (one-time)...');
    try {
      const ffmpeg = await getFFmpeg((p) => {
        setProgress(Math.max(0, Math.min(100, Math.round(p.progress * 100))));
      });
      setStage('Converting (may take a while for long videos)...');

      const inputName = 'input' + (file.name.match(/\.[^.]+$/)?.[0] ?? '');
      const outputName = `output.${format.ext}`;
      await ffmpeg.writeFile(inputName, await fetchFileBytes(file));
      await ffmpeg.exec(['-i', inputName, ...format.args, outputName]);
      const data: Uint8Array = await ffmpeg.readFile(outputName);
      const blob = new Blob([data as BlobPart], { type: format.mime });
      setResult(blob);
      try { await ffmpeg.deleteFile(inputName); await ffmpeg.deleteFile(outputName); } catch {}
    } catch (e: any) {
      setStage('Error: ' + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout slug="convert/video">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          FFmpeg.wasm is loaded from a CDN on first use. Supports MP4, WebM, GIF, and audio extraction (MP3).
        </p>
        <div className="flex items-start gap-2 p-3 rounded-lg border bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>In-browser video conversion is <strong>much slower</strong> than native FFmpeg. Best for short clips (&lt;1 min). Large files may run out of memory.</span>
        </div>

        {!file ? (
          <FileDropzone
            accept="video/*"
            onFiles={(fs) => { setFile(fs[0]); setResult(null); }}
            label="Choose a video file"
            hint="MP4, WebM, MOV, AVI, etc. — keep under ~100MB"
            maxSizeMB={500}
          />
        ) : (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="text-sm font-medium">{file.name}</div>
              <div className="space-y-1">
                <Label>Convert to:</Label>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((f) => (
                    <Button key={f.ext} variant={format.ext === f.ext ? 'default' : 'outline'} onClick={() => setFormat(f)}>
                      {f.ext.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {!result ? (
                  <Button onClick={handleConvert} disabled={loading} size="lg">
                    {loading ? <><Loader2 className="animate-spin" /> {progress}% — {stage}</> : `Convert to ${format.ext.toUpperCase()}`}
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const base = file.name.replace(/\.[^.]+$/, '');
                      downloadBlob(result, `${base}.${format.ext}`);
                    }}
                    size="lg"
                  ><Download /> Download</Button>
                )}
                <Button variant="outline" onClick={() => { setFile(null); setResult(null); }}>New file</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ToolLayout>
  );
}
