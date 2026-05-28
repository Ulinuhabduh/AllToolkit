'use client';

import { useEffect, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { downloadText } from '@/lib/utils';

const SAMPLE = `# Hello, Markdown!

Examples of **bold**, *italic*, and \`inline code\`.

## List
- Item one
- Item two
- Item three

## Code
\`\`\`js
console.log('Hello world');
\`\`\`

> Quote block

[Link](https://example.com)
`;

export default function MarkdownPage() {
  const [text, setText] = useState(SAMPLE);
  const [html, setHtml] = useState('');

  useEffect(() => {
    (async () => {
      const { marked } = await import('marked');
      const result = await marked.parse(text);
      setHtml(result);
    })();
  }, [text]);

  return (
    <ToolLayout slug="text/markdown">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Markdown</div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(text)}><Copy className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => downloadText(text, 'document.md', 'text/markdown')}><Download className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={20} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Preview</div>
              <Button size="sm" variant="ghost" onClick={() => downloadText(html, 'document.html', 'text/html')}><Download className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert min-h-[400px] p-3 rounded-md border" dangerouslySetInnerHTML={{ __html: html }} />
          </CardContent>
        </Card>
      </div>
    </ToolLayout>
  );
}
