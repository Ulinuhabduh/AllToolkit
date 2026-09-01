import { NextRequest, NextResponse } from 'next/server';
import { getJobsStore } from '@/lib/youtube-jobs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('id');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing "id" parameter' }, { status: 400 });
  }

  const store = getJobsStore();
  const job = store.get(jobId);

  if (!job) {
    return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    percent: job.percent,
    speed: job.speed,
    eta: job.eta,
    totalSize: job.totalSize,
    fileSize: job.fileSize,
    filename: job.filename,
    error: job.error,
  });
}
