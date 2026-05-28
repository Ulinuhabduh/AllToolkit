'use client';

import { useEffect, useState } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

const POPULAR = [
  'Asia/Jakarta', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Dubai', 'Asia/Kolkata',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'America/Sao_Paulo',
  'Australia/Sydney', 'Pacific/Auckland',
];

function formatTime(date: Date, tz: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export default function TimezonePage() {
  const [zones, setZones] = useState<string[]>(['Asia/Jakarta', 'Europe/London', 'America/New_York']);
  const [add, setAdd] = useState('');
  const [now, setNow] = useState(new Date());
  const [dt, setDt] = useState('');

  useEffect(() => {
    if (dt) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [dt]);

  const refDate = dt ? new Date(dt) : now;

  function addZone() {
    if (!add) return;
    try {
      new Intl.DateTimeFormat('en', { timeZone: add });
      if (!zones.includes(add)) setZones([...zones, add]);
      setAdd('');
    } catch {
      alert('Invalid timezone');
    }
  }

  return (
    <ToolLayout slug="utility/timezone">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1">
              <Label>Reference time (leave empty for live)</Label>
              <Input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Add timezone (e.g. Asia/Jakarta)" list="tzlist" />
              <datalist id="tzlist">{POPULAR.map((z) => <option key={z} value={z} />)}</datalist>
              <Button onClick={addZone}><Plus /> Add</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {zones.map((z) => (
            <Card key={z}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{z}</div>
                  <Button variant="ghost" size="icon" onClick={() => setZones(zones.filter((x) => x !== z))}><X className="h-4 w-4" /></Button>
                </div>
                <div className="font-mono text-sm">{formatTime(refDate, z)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
