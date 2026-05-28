'use client';

import { useEffect, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy } from 'lucide-react';

const ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function HashPage() {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      if (!input) { setHashes({}); return; }
      const enc = new TextEncoder().encode(input);
      const result: Record<string, string> = {};
      for (const algo of ALGOS) {
        const buf = await crypto.subtle.digest(algo, enc);
        result[algo] = bufToHex(buf);
      }
      setHashes(result);
    })();
  }, [input]);

  return (
    <ToolLayout slug="dev/hash">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea placeholder="Text to hash..." value={input} onChange={(e) => setInput(e.target.value)} rows={5} />
          </CardContent>
        </Card>

        {Object.entries(hashes).map(([algo, hex]) => (
          <Card key={algo}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm font-semibold">{algo}</div>
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(hex)}><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="font-mono text-xs break-all text-muted-foreground">{hex}</div>
            </CardContent>
          </Card>
        ))}

        <p className="text-xs text-muted-foreground">
          Note: MD5 is omitted because it is not available in the Web Crypto API (and is deprecated for hashing).
        </p>
      </div>
    </ToolLayout>
  );
}
