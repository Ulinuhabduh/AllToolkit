import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 3600; // cache 1 hour

const FRANKFURTER_SUPPORTED = new Set([
  'EUR','USD','JPY','BGN','CZK','DKK','GBP','HUF','PLN','RON','SEK','CHF','ISK','NOK','TRY',
  'AUD','BRL','CAD','CNY','HKD','IDR','ILS','INR','KRW','MXN','MYR','NZD','PHP','SGD','THB','ZAR',
]);

export async function GET(req: NextRequest) {
  const base = (req.nextUrl.searchParams.get('from') || 'USD').toUpperCase();

  // Primary: Frankfurter (ECB rates, free, reliable)
  if (FRANKFURTER_SUPPORTED.has(base)) {
    try {
      const r = await fetch(`https://api.frankfurter.app/latest?from=${base}`, { next: { revalidate: 3600 } });
      if (r.ok) {
        const d = await r.json();
        return NextResponse.json({
          base: d.base,
          date: d.date,
          rates: { ...d.rates, [base]: 1 },
          source: 'frankfurter.app',
        });
      }
    } catch {}
  }

  // Fallback: open.er-api.com (broader coverage)
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${base}`, { next: { revalidate: 3600 } });
    if (r.ok) {
      const d = await r.json();
      return NextResponse.json({
        base,
        date: d.time_last_update_utc?.slice(0, 16) ?? new Date().toISOString().slice(0, 10),
        rates: d.rates,
        source: 'open.er-api.com',
      });
    }
  } catch {}

  return NextResponse.json({ error: 'Unable to fetch exchange rates right now. Please try again later.' }, { status: 502 });
}
