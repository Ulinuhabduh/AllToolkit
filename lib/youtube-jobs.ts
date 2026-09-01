/**
 * In-memory job tracker for YouTube download and progress monitoring.
 */

export interface YouTubeJob {
  id: string;
  url: string;
  type: 'video' | 'audio';
  quality: string;
  filename: string;
  ext: string;
  mimeType: string;
  status: 'starting' | 'downloading' | 'merging' | 'ready' | 'error';
  percent: number;
  speed: string;
  eta: string;
  totalSize: string;
  filePath?: string;
  fileSize?: number;
  error?: string;
  createdAt: number;
}

// Global store across Next.js API requests
declare global {
  var _ytJobsStore: Map<string, YouTubeJob> | undefined;
}

export function getJobsStore(): Map<string, YouTubeJob> {
  if (!globalThis._ytJobsStore) {
    globalThis._ytJobsStore = new Map<string, YouTubeJob>();
  }
  return globalThis._ytJobsStore;
}

export function cleanOldJobs() {
  const store = getJobsStore();
  const now = Date.now();
  for (const [id, job] of store.entries()) {
    // Delete jobs older than 15 minutes
    if (now - job.createdAt > 15 * 60 * 1000) {
      store.delete(id);
    }
  }
}
