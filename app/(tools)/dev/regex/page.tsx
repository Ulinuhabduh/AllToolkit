'use client';

import { useMemo, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function RegexPage() {
  const [pattern, setPattern] = useState('\\b\\w+@\\w+\\.\\w+\\b');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('Contact me at hello@example.com or test@domain.id, thank you!');

  const { highlighted, matches, error } = useMemo(() => {
    try {
      const re = new RegExp(pattern, flags);
      const matches: string[] = [];
      let result = '';
      if (flags.includes('g')) {
        let lastIndex = 0;
        let m: RegExpExecArray | null;
        const re2 = new RegExp(pattern, flags);
        while ((m = re2.exec(text)) !== null) {
          matches.push(m[0]);
          result += escapeHtml(text.slice(lastIndex, m.index));
          result += `<mark class="bg-yellow-200 dark:bg-yellow-500/30 rounded px-0.5">${escapeHtml(m[0])}</mark>`;
          lastIndex = m.index + m[0].length;
          if (m[0].length === 0) re2.lastIndex++;
        }
        result += escapeHtml(text.slice(lastIndex));
      } else {
        const m = re.exec(text);
        if (m) {
          matches.push(m[0]);
          result =
            escapeHtml(text.slice(0, m.index)) +
            `<mark class="bg-yellow-200 dark:bg-yellow-500/30 rounded px-0.5">${escapeHtml(m[0])}</mark>` +
            escapeHtml(text.slice(m.index + m[0].length));
        } else {
          result = escapeHtml(text);
        }
      }
      return { highlighted: result, matches, error: null as string | null };
    } catch (e: any) {
      return { highlighted: escapeHtml(text), matches: [], error: e.message as string };
    }
  }, [pattern, flags, text]);

  return (
    <ToolLayout slug="dev/regex">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-[1fr_140px] gap-2">
              <div className="space-y-1">
                <Label>Pattern</Label>
                <Input value={pattern} onChange={(e) => setPattern(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-1">
                <Label>Flags</Label>
                <Input value={flags} onChange={(e) => setFlags(e.target.value)} className="font-mono" placeholder="gimsu" />
              </div>
            </div>
            {error && <div className="text-sm text-destructive">⚠ {error}</div>}
            <div className="space-y-1">
              <Label>Test string</Label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-medium">Result ({matches.length} match{matches.length === 1 ? '' : 'es'})</div>
            <pre className="whitespace-pre-wrap break-words p-3 rounded-lg bg-muted text-sm" dangerouslySetInnerHTML={{ __html: highlighted }} />
            {matches.length > 0 && (
              <ul className="space-y-1 text-sm font-mono">
                {matches.map((m, i) => <li key={i} className="text-muted-foreground">{i + 1}. {m}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </ToolLayout>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
}
