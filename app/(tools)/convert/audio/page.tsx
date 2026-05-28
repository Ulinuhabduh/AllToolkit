'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { downloadBlob } from '@/lib/utils';
import { getFFmpeg, fetchFileBytes } from '@/lib/ffmpeg';

const FORMATS = [
  { ext: 'mp3', mime: 'audio/mpeg', codec: ['-c:a', 'libmp3lame', '-q:a', '4'] },
  { ext: 'wav', mime: 'audio/wav', codec: ['-c:a', 'pcm_s16le'] },
  { ext: 'ogg', mime: 'audio/ogg', codec: ['-c:a', 'libvorbis', '-q:a', '5'] },
  { ext: 'm4a', mime: 'audio/mp4', codec: ['-c:a', 'aac', '-b:a', '192k'] },
  { ext: 'flac', mime: 'audio/flac', codec: ['-c:a', 'flac'] },
];

export default function AudioConvertPage() {
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
      setStage('Converting...');

      const inputName = 'input' + (file.name.match(/\.[^.]+$/)?.[0] ?? '');
      const outputName = `output.${format.ext}`;
      await ffmpeg.writeFile(inputName, await fetchFileBytes(file));
      await ffmpeg.exec(['-i', inputName, ...format.codec, outputName]);
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
    <ToolLayout slug="convert/audio">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          FFmpeg.wasm (~30MB) is loaded from a CDN on first use, then cached.
          Supports MP3, WAV, OGG, M4A, FLAC.
        </p>

        {!file ? (
          <FileDropzone
            accept="audio/*"
            onFiles={(fs) => { setFile(fs[0]); setResult(null); }}
            label="Choose an audio file"
            hint="MP3, WAV, OGG, M4A, FLAC, AAC, etc."
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
