'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Download, Loader2, ScanText, Copy } from 'lucide-react';
import { downloadText } from '@/lib/utils';

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'ind', name: 'Indonesian' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'kor', name: 'Korean' },
  { code: 'ara', name: 'Arabic' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
];

export default function PdfOcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState('eng');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  async function imagesFromFile(f: File): Promise<HTMLCanvasElement[]> {
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
      const pdfjs = await import('pdfjs-dist');
      // @ts-ignore
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const data = await f.arrayBuffer();
      const doc = await pdfjs.getDocument({ data }).promise;
      const out: HTMLCanvasElement[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        out.push(canvas);
      }
      return out;
    }
    const img = new Image();
    img.src = URL.createObjectURL(f);
    await new Promise((r) => (img.onload = r));
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d')!.drawImage(img, 0, 0);
    return [c];
  }

  async function handleOcr() {
    if (!file) return;
    setLoading(true);
    setText('');
    setProgress(0);
    try {
      const Tesseract = await import('tesseract.js');
      setStatus('Preparing...');
      const pages = await imagesFromFile(file);
      const worker = await Tesseract.createWorker(lang, 1, {
        logger: (m: any) => {
          if (m.status) setStatus(m.status);
          if (typeof m.progress === 'number') setProgress(Math.round(m.progress * 100));
        },
      });
      let combined = '';
      for (let i = 0; i < pages.length; i++) {
        setStatus(`Recognizing page ${i + 1}/${pages.length}`);
        const { data } = await worker.recognize(pages[i]);
        combined += data.text + (pages.length > 1 ? `\n\n--- Page ${i + 2} ---\n\n` : '');
      }
      await worker.terminate();
      setText(combined.trim());
    } catch (e: any) {
      setStatus('Error: ' + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout slug="pdf/ocr">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Extract text from PDFs or images (Tesseract.js). The language model is downloaded once on first use.
        </p>

        {!file ? (
          <FileDropzone
            accept=".pdf,application/pdf,image/*"
            onFiles={(fs) => { setFile(fs[0]); setText(''); }}
            label="Choose a PDF or image"
          />
        ) : (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">{file.name}</div>
              <div className="space-y-1">
                <Label>Language</Label>
                <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleOcr} disabled={loading} size="lg">
                  {loading ? <><Loader2 className="animate-spin" /> {progress}% — {status}</> : <><ScanText /> Extract Text</>}
                </Button>
                <Button variant="outline" onClick={() => { setFile(null); setText(''); }}>New file</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {text && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Result ({text.length} characters)</div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(text)}><Copy className="h-3.5 w-3.5" /> Copy</Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadText(text, 'ocr-result.txt')}><Download className="h-3.5 w-3.5" /> Download</Button>
                </div>
              </div>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={18} />
            </CardContent>
          </Card>
        )}
      </div>
    </ToolLayout>
  );
}
