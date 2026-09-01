/**
 * Utility functions for YouTube URL parsing and ID extraction.
 */

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();

  // 1. Standard watch URL: youtube.com/watch?v=...
  const watchMatch = clean.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/clip\/|music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // 2. Query param search: ?v=... or &v=...
  const queryMatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (queryMatch && queryMatch[1]) return queryMatch[1];

  // 3. Plain 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;

  return null;
}
