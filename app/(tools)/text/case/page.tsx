'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

function toTitle(s: string) { return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }
function toSentence(s: string) { return s.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase()); }
function toCamel(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (c) => c.toLowerCase()); }
function toPascal(s: string) { const c = toCamel(s); return c.charAt(0).toUpperCase() + c.slice(1); }
function toSnake(s: string) { return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
function toKebab(s: string) { return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function toConstant(s: string) { return toSnake(s).toUpperCase(); }
function reverseStr(s: string) { return s.split('').reverse().join(''); }

const TRANSFORMS = [
  { name: 'UPPERCASE', fn: (s: string) => s.toUpperCase() },
  { name: 'lowercase', fn: (s: string) => s.toLowerCase() },
  { name: 'Title Case', fn: toTitle },
  { name: 'Sentence case', fn: toSentence },
  { name: 'camelCase', fn: toCamel },
  { name: 'PascalCase', fn: toPascal },
  { name: 'snake_case', fn: toSnake },
  { name: 'kebab-case', fn: toKebab },
  { name: 'CONSTANT_CASE', fn: toConstant },
  { name: 'reverse', fn: reverseStr },
];

export default function CasePage() {
  const [text, setText] = useState('Hello World example text');

  return (
    <ToolLayout slug="text/case">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {TRANSFORMS.map((t) => (
                <Button key={t.name} variant="outline" onClick={() => setText(t.fn(text))}>{t.name}</Button>
              ))}
            </div>
            <Button onClick={() => navigator.clipboard.writeText(text)}><Copy /> Copy result</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium">Preview of all transformations</div>
            <ul className="divide-y text-sm font-mono">
              {TRANSFORMS.map((t) => (
                <li key={t.name} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-muted-foreground w-32 shrink-0">{t.name}</span>
                  <span className="flex-1 truncate">{t.fn(text)}</span>
                  <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(t.fn(text))}><Copy className="h-3.5 w-3.5" /></Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </ToolLayout>
  );
}
