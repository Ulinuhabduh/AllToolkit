'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Download, Loader2, Copy } from 'lucide-react';
import { downloadText } from '@/lib/utils';

type OutFormat = 'html' | 'md' | 'txt';

export default function DocumentConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [output, setOutput] = useState<OutFormat>('md');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function handleConvert() {
    if (!file) return;
    setLoading(true);
    setInfo(null);
    try {
      const name = file.name.toLowerCase();
      let html = '';

      if (name.endsWith('.docx')) {
        const mammoth = await import('mammoth');
        const buf = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        html = result.value;
        if (result.messages.length > 0) {
          setInfo(`${result.messages.length} parser warning(s) (typically about styling).`);
        }
      } else if (name.endsWith('.html') || name.endsWith('.htm')) {
        html = await file.text();
      } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
        const { marked } = await import('marked');
        html = await marked.parse(await file.text());
      } else if (name.endsWith('.txt')) {
        const raw = await file.text();
        html = '<pre>' + raw.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' } as any)[c]) + '</pre>';
      } else {
        setInfo('Unsupported format. Use .docx, .md, .html, or .txt.');
        setLoading(false);
        return;
      }

      let result = '';
      if (output === 'html') {
        result = html;
      } else if (output === 'md') {
        const TurndownService = (await import('turndown')).default;
        const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
        result = td.turndown(html);
      } else {
        const div = document.createElement('div');
        div.innerHTML = html;
        result = div.textContent || '';
      }

      setText(result);
    } catch (e: any) {
      setInfo('Error: ' + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout slug="convert/document">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Convert documents between formats: DOCX → HTML/MD/TXT, MD → HTML, HTML → MD/TXT.
        </p>

        {!file ? (
          <FileDropzone
            accept=".docx,.md,.markdown,.html,.htm,.txt"
            onFiles={(fs) => { setFile(fs[0]); setText(''); }}
            label="Choose a document"
            hint="Supports .docx, .md, .html, .txt"
          />
        ) : (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">{file.name}</div>
              <div className="space-y-1">
                <Label>Convert to:</Label>
                <div className="flex gap-2">
                  {(['md', 'html', 'txt'] as OutFormat[]).map((f) => (
                    <Button key={f} variant={output === f ? 'default' : 'outline'} onClick={() => setOutput(f)}>{f.toUpperCase()}</Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleConvert} disabled={loading} size="lg">
                  {loading ? <><Loader2 className="animate-spin" /> Processing...</> : 'Convert'}
                </Button>
                <Button variant="outline" onClick={() => { setFile(null); setText(''); }}>New file</Button>
              </div>
              {info && <div className="text-sm text-muted-foreground">{info}</div>}
            </CardContent>
          </Card>
        )}

        {text && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Result</div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(text)}><Copy className="h-3.5 w-3.5" /> Copy</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    const base = file?.name.replace(/\.[^.]+$/, '') ?? 'document';
                    const mime = output === 'html' ? 'text/html' : output === 'md' ? 'text/markdown' : 'text/plain';
                    downloadText(text, `${base}.${output}`, mime);
                  }}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
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
