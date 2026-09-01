import { NextRequest, NextResponse } from 'next/server';
import { extractYouTubeId } from '@/lib/youtube-utils';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing "url" parameter' }, { status: 400 });
  }

  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return NextResponse.json({ error: 'Invalid YouTube URL or Video ID' }, { status: 400 });
  }

  const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // 1. Fetch oEmbed metadata
    let title = 'YouTube Video';
    let author = 'YouTube Creator';
    let authorUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    let html = '';

    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(standardUrl)}&format=json`, {
        next: { revalidate: 3600 },
      });
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title || title;
        author = data.author_name || author;
        authorUrl = data.author_url || authorUrl;
        thumbnail = data.thumbnail_url || thumbnail;
        html = data.html || '';
      }
    } catch {
      // ignore oembed error
    }

    const thumbnails = {
      maxres: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      hq: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      mq: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      default: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };

    const videoFormats = [
      { quality: '1080p', label: '1080p Full HD', ext: 'mp4', note: 'Highest Video Quality' },
      { quality: '720p', label: '720p HD', ext: 'mp4', note: 'Recommended (Balanced)' },
      { quality: '480p', label: '480p SD', ext: 'mp4', note: 'Standard Definition' },
      { quality: '360p', label: '360p Medium', ext: 'mp4', note: 'Low Bandwidth' },
    ];

    const audioFormats = [
      { quality: '320kbps', label: 'MP3 320 kbps', ext: 'mp3', note: 'Studio Quality Audio' },
      { quality: '192kbps', label: 'MP3 192 kbps', ext: 'mp3', note: 'High Quality Audio' },
      { quality: '128kbps', label: 'MP3 128 kbps', ext: 'mp3', note: 'Standard MP3' },
      { quality: 'original', label: 'M4A / AAC', ext: 'm4a', note: 'Original Audio Track' },
      { quality: 'wav', label: 'WAV Audio', ext: 'wav', note: 'Lossless Audio' },
    ];

    return NextResponse.json({
      success: true,
      videoId,
      standardUrl,
      title,
      author,
      authorUrl,
      thumbnail: thumbnails.maxres,
      thumbnails,
      html,
      videoFormats,
      audioFormats,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch video info' }, { status: 500 });
  }
}
