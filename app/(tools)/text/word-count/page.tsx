'use client';

import { useMemo, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function WordCountPage() {
  const [text, setText] = useState('');

  const stats = useMemo(() => {
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
    const sentences = (text.match(/[.!?]+(\s|$)/g) ?? []).length;
    const paragraphs = text.trim() ? text.trim().split(/\n\s*\n/).length : 0;
    const readMin = Math.max(1, Math.round(words / 200));
    return { chars, charsNoSpace, words, lines, sentences, paragraphs, readMin };
  }, [text]);

  const items = [
    { label: 'Characters', value: stats.chars },
    { label: 'Characters (no spaces)', value: stats.charsNoSpace },
    { label: 'Words', value: stats.words },
    { label: 'Sentences', value: stats.sentences },
    { label: 'Paragraphs', value: stats.paragraphs },
    { label: 'Lines', value: stats.lines },
    { label: 'Estimated reading time', value: `${stats.readMin} min` },
  ];

  return (
    <ToolLayout slug="text/word-count">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <Textarea placeholder="Paste your text here..." value={text} onChange={(e) => setText(e.target.value)} rows={12} />
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((it) => (
            <Card key={it.label}>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{it.label}</div>
                <div className="text-2xl font-bold">{it.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
