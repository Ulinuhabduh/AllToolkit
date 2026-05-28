'use client';

import { useMemo, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { diffLines, type Change } from 'diff';

export default function DiffPage() {
  const [a, setA] = useState('Hello world\nthis is line 2\nthis is line 3');
  const [b, setB] = useState('Hello world\nthis is the updated line 2\nthis is line 3\nnew line at end');

  const changes: Change[] = useMemo(() => diffLines(a, b), [a, b]);

  return (
    <ToolLayout slug="dev/diff">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Text A</Label>
              <Textarea value={a} onChange={(e) => setA(e.target.value)} rows={10} />
            </div>
            <div className="space-y-1">
              <Label>Text B</Label>
              <Textarea value={b} onChange={(e) => setB(e.target.value)} rows={10} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">Differences</div>
            <pre className="rounded-lg overflow-x-auto text-sm font-mono">
              {changes.map((c, i) => {
                const cls = c.added
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : c.removed
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 line-through'
                    : 'text-muted-foreground';
                const sign = c.added ? '+ ' : c.removed ? '- ' : '  ';
                return (
                  <span key={i} className={`block px-3 py-0.5 ${cls}`}>
                    {c.value.split('\n').filter((l, idx, arr) => !(idx === arr.length - 1 && l === '')).map((line, j) => (
                      <span key={j} className="block">{sign}{line}</span>
                    ))}
                  </span>
                );
              })}
            </pre>
          </CardContent>
        </Card>
      </div>
    </ToolLayout>
  );
}
