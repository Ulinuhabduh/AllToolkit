'use client';

import { useEffect, useMemo, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

const CURRENCIES: Record<string, string> = {
  USD: 'US Dollar', EUR: 'Euro', IDR: 'Indonesian Rupiah', JPY: 'Japanese Yen',
  GBP: 'British Pound', AUD: 'Australian Dollar', CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc', CNY: 'Chinese Yuan', HKD: 'Hong Kong Dollar',
  NZD: 'NZ Dollar', SEK: 'Swedish Krona', KRW: 'Korean Won',
  SGD: 'Singapore Dollar', NOK: 'Norwegian Krone', MXN: 'Mexican Peso',
  INR: 'Indian Rupee', RUB: 'Russian Ruble', ZAR: 'South African Rand',
  TRY: 'Turkish Lira', BRL: 'Brazilian Real', TWD: 'Taiwan Dollar',
  DKK: 'Danish Krone', PLN: 'Polish Zloty', THB: 'Thai Baht',
  MYR: 'Malaysian Ringgit', HUF: 'Hungarian Forint', CZK: 'Czech Koruna',
  ILS: 'Israeli Shekel', PHP: 'Philippine Peso',
};

type Rates = { base: string; date: string; rates: Record<string, number> };

export default function CurrencyPage() {
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('IDR');
  const [amount, setAmount] = useState(1);
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  async function fetchRates(base: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/currency?from=${base}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch rates');
      setRates({ base: data.base, date: data.date, rates: data.rates });
      setLastFetched(new Date());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch rates');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRates(from); }, [from]);

  const converted = useMemo(() => {
    if (!rates) return 0;
    const r = rates.rates[to];
    return r ? amount * r : 0;
  }, [rates, amount, to]);

  const popularPairs = useMemo(() => {
    if (!rates) return [];
    return ['USD', 'EUR', 'JPY', 'SGD', 'MYR', 'CNY']
      .filter((c) => c !== from && rates.rates[c])
      .map((c) => ({ code: c, rate: rates.rates[c] }));
  }, [rates, from]);

  function swap() { setFrom(to); setTo(from); }

  return (
    <ToolLayout slug="utility/currency">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
              <div className="space-y-1">
                <Label>From</Label>
                <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  {Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                </select>
                <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} step="0.01" />
              </div>
              <Button variant="ghost" size="icon" onClick={swap} aria-label="Swap" className="mb-1"><ArrowRightLeft className="h-4 w-4" /></Button>
              <div className="space-y-1">
                <Label>To</Label>
                <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  {Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                </select>
                <Input
                  readOnly
                  value={loading ? '…' : converted.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                  className="text-lg font-semibold"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <div>
                {loading ? (
                  <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading rates...</span>
                ) : error ? (
                  <span className="inline-flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> {error}</span>
                ) : rates ? (
                  <span>1 {from} = <strong className="text-foreground">{rates.rates[to]?.toFixed(4) ?? '—'}</strong> {to} · as of {rates.date}</span>
                ) : null}
              </div>
              <Button size="sm" variant="ghost" onClick={() => fetchRates(from)} disabled={loading}>
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {popularPairs.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium mb-3">Popular rates (1 {from} →)</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {popularPairs.map((p) => (
                  <button
                    key={p.code}
                    onClick={() => setTo(p.code)}
                    className="text-left rounded-lg border p-3 hover:border-foreground/40 transition"
                  >
                    <div className="text-xs text-muted-foreground">{p.code}</div>
                    <div className="font-mono font-medium">{p.rate.toFixed(4)}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">
          Rates sourced from Frankfurter (ECB) and open.er-api.com via our API proxy (cached 1 hour). {lastFetched && `Last updated ${lastFetched.toLocaleTimeString()}.`} Rates are indicative — for actual transactions check with your bank/broker.
        </p>
      </div>
    </ToolLayout>
  );
}
