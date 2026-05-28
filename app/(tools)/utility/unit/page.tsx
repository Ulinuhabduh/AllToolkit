'use client';

import { useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type UnitDef = { name: string; toBase: (v: number) => number; fromBase: (v: number) => number };
type Category = { name: string; units: Record<string, UnitDef> };

const CATEGORIES: Record<string, Category> = {
  length: {
    name: 'Length',
    units: {
      mm: { name: 'Millimeter', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      cm: { name: 'Centimeter', toBase: (v) => v / 100, fromBase: (v) => v * 100 },
      m: { name: 'Meter', toBase: (v) => v, fromBase: (v) => v },
      km: { name: 'Kilometer', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      in: { name: 'Inch', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      ft: { name: 'Foot', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      mi: { name: 'Mile', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
    },
  },
  weight: {
    name: 'Weight',
    units: {
      mg: { name: 'Milligram', toBase: (v) => v / 1_000_000, fromBase: (v) => v * 1_000_000 },
      g: { name: 'Gram', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      kg: { name: 'Kilogram', toBase: (v) => v, fromBase: (v) => v },
      lb: { name: 'Pound', toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
      oz: { name: 'Ounce', toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 },
    },
  },
  temperature: {
    name: 'Temperature',
    units: {
      c: { name: 'Celsius', toBase: (v) => v, fromBase: (v) => v },
      f: { name: 'Fahrenheit', toBase: (v) => (v - 32) * (5 / 9), fromBase: (v) => v * (9 / 5) + 32 },
      k: { name: 'Kelvin', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    },
  },
  volume: {
    name: 'Volume',
    units: {
      ml: { name: 'Milliliter', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      l: { name: 'Liter', toBase: (v) => v, fromBase: (v) => v },
      gal: { name: 'US Gallon', toBase: (v) => v * 3.78541, fromBase: (v) => v / 3.78541 },
      cup: { name: 'Cup', toBase: (v) => v * 0.24, fromBase: (v) => v / 0.24 },
    },
  },
  time: {
    name: 'Time',
    units: {
      s: { name: 'Second', toBase: (v) => v, fromBase: (v) => v },
      min: { name: 'Minute', toBase: (v) => v * 60, fromBase: (v) => v / 60 },
      hr: { name: 'Hour', toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
      day: { name: 'Day', toBase: (v) => v * 86400, fromBase: (v) => v / 86400 },
    },
  },
};

export default function UnitPage() {
  const [cat, setCat] = useState<keyof typeof CATEGORIES>('length');
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('ft');
  const [value, setValue] = useState(1);

  const c = CATEGORIES[cat];
  const result = (() => {
    const fu = c.units[from], tu = c.units[to];
    if (!fu || !tu) return 0;
    return tu.fromBase(fu.toBase(value));
  })();

  function changeCat(k: keyof typeof CATEGORIES) {
    setCat(k);
    const keys = Object.keys(CATEGORIES[k].units);
    setFrom(keys[0]);
    setTo(keys[1] ?? keys[0]);
  }

  return (
    <ToolLayout slug="utility/unit">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <Button key={k} variant={cat === k ? 'default' : 'outline'} size="sm" onClick={() => changeCat(k as any)}>{v.name}</Button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div className="space-y-1">
                <Label>From</Label>
                <Input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
                <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm">
                  {Object.entries(c.units).map(([k, u]) => <option key={k} value={k}>{u.name}</option>)}
                </select>
              </div>
              <div className="text-2xl text-muted-foreground hidden md:block">→</div>
              <div className="space-y-1">
                <Label>To</Label>
                <Input readOnly value={Number.isFinite(result) ? result.toFixed(6).replace(/\.?0+$/, '') : ''} />
                <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm">
                  {Object.entries(c.units).map(([k, u]) => <option key={k} value={k}>{u.name}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ToolLayout>
  );
}
