'use client';

import { useEffect, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, RefreshCw } from 'lucide-react';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/';

function pick(charset: string, n: number) {
  const out = new Uint32Array(n);
  crypto.getRandomValues(out);
  let s = '';
  for (let i = 0; i < n; i++) s += charset[out[i] % charset.length];
  return s;
}

function strengthLabel(len: number, classes: number) {
  const score = len * classes;
  if (score < 20) return { label: 'Weak', color: 'text-rose-600' };
  if (score < 40) return { label: 'Medium', color: 'text-amber-600' };
  if (score < 64) return { label: 'Strong', color: 'text-emerald-600' };
  return { label: 'Very strong', color: 'text-emerald-700 dark:text-emerald-400' };
}

export default function PasswordPage() {
  const [length, setLength] = useState(16);
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  const [nums, setNums] = useState(true);
  const [syms, setSyms] = useState(true);
  const [pwd, setPwd] = useState('');

  function generate() {
    let charset = '';
    let classes = 0;
    if (lower) { charset += LOWER; classes++; }
    if (upper) { charset += UPPER; classes++; }
    if (nums) { charset += NUMS; classes++; }
    if (syms) { charset += SYMBOLS; classes++; }
    if (!charset) { setPwd(''); return; }
    setPwd(pick(charset, length));
  }

  useEffect(() => { generate(); /* eslint-disable-next-line */ }, [length, lower, upper, nums, syms]);

  const classes = [lower, upper, nums, syms].filter(Boolean).length;
  const s = strengthLabel(length, classes);

  return (
    <ToolLayout slug="utility/password">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input readOnly value={pwd} className="font-mono text-base" />
              <Button variant="outline" size="icon" onClick={generate}><RefreshCw className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(pwd)}><Copy className="h-4 w-4" /></Button>
            </div>
            <div className={`text-sm ${s.color}`}>Strength: {s.label}</div>

            <div className="space-y-1">
              <Label>Length: {length}</Label>
              <Input type="range" min="4" max="64" value={length} onChange={(e) => setLength(Number(e.target.value))} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Toggle on={lower} setOn={setLower} label="a-z" />
              <Toggle on={upper} setOn={setUpper} label="A-Z" />
              <Toggle on={nums} setOn={setNums} label="0-9" />
              <Toggle on={syms} setOn={setSyms} label="symbols" />
            </div>
          </CardContent>
        </Card>
      </div>
    </ToolLayout>
  );
}

function Toggle({ on, setOn, label }: { on: boolean; setOn: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => setOn(!on)}
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-mono ${on ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
    >
      <span>{label}</span>
      <span>{on ? '✓' : ''}</span>
    </button>
  );
}
