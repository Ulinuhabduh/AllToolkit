'use client';

import { useMemo, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Wand2, Minus, AlertCircle, Check } from 'lucide-react';

export default function JsonPage() {
  const [input, setInput] = useState('{\n  "hello": "world",\n  "items": [1, 2, 3]\n}');

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(input) };
    } catch (e: any) {
      return { ok: false as const, error: e.message as string };
    }
  }, [input]);

  function format(spaces: number) {
    if (!parsed.ok) return;
    setInput(JSON.stringify(parsed.value, null, spaces));
  }
  function minify() {
    if (!parsed.ok) return;
    setInput(JSON.stringify(parsed.value));
  }
  function copy() { navigator.clipboard.writeText(input); }

  return (
    <ToolLayout slug="dev/json">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => format(2)} disabled={!parsed.ok}><Wand2 /> Format (2)</Button>
              <Button onClick={() => format(4)} variant="outline" disabled={!parsed.ok}>Format (4)</Button>
              <Button onClick={minify} variant="outline" disabled={!parsed.ok}><Minus /> Minify</Button>
              <Button onClick={copy} variant="outline"><Copy /> Copy</Button>
            </div>
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={18} className="font-mono text-sm" />
            <div className="text-sm">
              {parsed.ok ? (
                <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="h-4 w-4" /> Valid JSON</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-destructive"><AlertCircle className="h-4 w-4" /> {parsed.error}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ToolLayout>
  );
}
