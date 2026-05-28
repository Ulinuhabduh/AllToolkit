'use client';

import { useMemo, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, RefreshCw } from 'lucide-react';

const WORDS = `lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum`.split(' ');

function rand(arr: string[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function makeSentence() {
  const len = 5 + Math.floor(Math.random() * 10);
  const words: string[] = [];
  for (let i = 0; i < len; i++) words.push(rand(WORDS));
  return words.join(' ').replace(/^./, (c) => c.toUpperCase()) + '.';
}
function makeParagraph() {
  const n = 3 + Math.floor(Math.random() * 4);
  return Array.from({ length: n }, makeSentence).join(' ');
}

export default function LoremPage() {
  const [count, setCount] = useState(3);
  const [mode, setMode] = useState<'paragraphs' | 'sentences' | 'words'>('paragraphs');
  const [tick, setTick] = useState(0);

  const text = useMemo(() => {
    void tick;
    if (mode === 'paragraphs') return Array.from({ length: count }, makeParagraph).join('\n\n');
    if (mode === 'sentences') return Array.from({ length: count }, makeSentence).join(' ');
    return Array.from({ length: count }, () => rand(WORDS)).join(' ');
  }, [count, mode, tick]);

  return (
    <ToolLayout slug="text/lorem">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Count</Label>
              <Input type="number" min="1" max="100" value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Mode</Label>
              <div className="flex gap-2">
                {(['paragraphs', 'sentences', 'words'] as const).map((m) => (
                  <Button key={m} variant={mode === m ? 'default' : 'outline'} size="sm" onClick={() => setMode(m)}>{m}</Button>
                ))}
                <Button variant="ghost" size="icon" onClick={() => setTick(tick + 1)}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <Textarea readOnly value={text} rows={14} />
            <Button onClick={() => navigator.clipboard.writeText(text)}><Copy /> Copy</Button>
          </CardContent>
        </Card>
      </div>
    </ToolLayout>
  );
}
