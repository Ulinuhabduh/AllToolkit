'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightLeft, Copy } from 'lucide-react';

export default function Base64Page() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function process() {
    setError(null);
    try {
      if (mode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input.trim()))));
      }
    } catch (e: any) {
      setError('Invalid input for ' + mode);
      setOutput('');
    }
  }

  return (
    <ToolLayout slug="dev/base64">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Button variant={mode === 'encode' ? 'default' : 'outline'} onClick={() => setMode('encode')}>Encode</Button>
              <Button variant={mode === 'decode' ? 'default' : 'outline'} onClick={() => setMode('decode')}>Decode</Button>
              <Button variant="ghost" size="icon" onClick={() => { setMode(mode === 'encode' ? 'decode' : 'encode'); setInput(output); setOutput(''); }} aria-label="Swap">
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            </div>
            <Textarea placeholder={mode === 'encode' ? 'Plain text...' : 'Base64 string...'} value={input} onChange={(e) => setInput(e.target.value)} rows={6} />
            <Button onClick={process}>{mode === 'encode' ? 'Encode →' : 'Decode →'}</Button>
            {error && <div className="text-sm text-destructive">{error}</div>}
            {output && (
              <>
                <Textarea readOnly value={output} rows={6} />
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(output)}><Copy /> Copy</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ToolLayout>
  );
}
