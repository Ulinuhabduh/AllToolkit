'use client';

import { useState, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Download, Loader2, Play, Music2, Film, Image as ImageIcon,
  ExternalLink, Copy, Check, Sparkles, RefreshCw,
  ClipboardPaste, History, Clock, FileAudio, Youtube,
  Volume2, ShieldCheck, ArrowRight, Zap, CheckCircle2,
  Cpu, Sliders, AlertCircle, FileCheck, Timer
} from 'lucide-react';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { extractYouTubeId } from '@/lib/youtube-utils';

interface VideoInfo {
  videoId: string;
  standardUrl: string;
  title: string;
  author: string;
  authorUrl: string;
  thumbnail: string;
  thumbnails: {
    maxres: string;
    hq: string;
    mq: string;
    default: string;
  };
  html: string;
  videoFormats: { quality: string; label: string; ext: string; note: string }[];
  audioFormats: { quality: string; label: string; ext: string; note: string }[];
}

interface RecentItem {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  timestamp: number;
}

const SAMPLE_VIDEOS = [
  { label: 'Rick Astley - Never Gonna Give You Up', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { label: 'Lofi Girl - Synthwave', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
];

export default function YoutubeDownloaderPage() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'thumbnail'>('video');
  const [showPlayer, setShowPlayer] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Selected format for direct download
  const [selectedFormat, setSelectedFormat] = useState<{
    type: 'video' | 'audio';
    quality: string;
    ext: string;
    label: string;
  }>({
    type: 'video',
    quality: '720p',
    ext: 'mp4',
    label: '720p HD',
  });

  // Real-Time Progress State from Backend Engine
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [downloadEta, setDownloadEta] = useState('');
  const [downloadTotalSize, setDownloadTotalSize] = useState('');
  const [downloadStatusText, setDownloadStatusText] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Load recent downloads from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('alltools_yt_recent');
      if (saved) setRecentItems(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  function saveToRecent(info: VideoInfo) {
    setRecentItems((prev) => {
      const filtered = prev.filter((item) => item.videoId !== info.videoId);
      const next = [
        {
          videoId: info.videoId,
          title: info.title,
          author: info.author,
          thumbnail: info.thumbnail,
          timestamp: Date.now(),
        },
        ...filtered,
      ].slice(0, 8);

      try {
        localStorage.setItem('alltools_yt_recent', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text);
        fetchVideoInfo(text);
      }
    } catch {
      alert('Clipboard permission denied. Please paste manually into the input box.');
    }
  }

  async function fetchVideoInfo(urlToFetch?: string) {
    const targetUrl = urlToFetch || urlInput;
    if (!targetUrl.trim()) return;

    setError(null);
    setLoading(true);
    setShowPlayer(false);
    setDownloadSuccess(null);
    setDownloadError(null);

    try {
      const res = await fetch(`/api/youtube/info?url=${encodeURIComponent(targetUrl.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not find YouTube video. Please check the URL.');
      }

      setVideoInfo(data);
      saveToRecent(data);
      setSelectedFormat({
        type: 'video',
        quality: '720p',
        ext: 'mp4',
        label: '720p HD',
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to fetch YouTube details. Please ensure the link is valid and public.');
      setVideoInfo(null);
    } finally {
      setLoading(false);
    }
  }

  // 100% In-App Direct Download Execution with Real-Time yt-dlp Progress Tracking
  async function triggerDirectDownload() {
    if (!videoInfo || !selectedFormat) return;

    setIsDownloading(true);
    setDownloadSuccess(null);
    setDownloadError(null);
    setDownloadProgress(2);
    setDownloadSpeed('Initializing...');
    setDownloadEta('--');
    setDownloadTotalSize('Calculating...');
    setDownloadStatusText(`Connecting to media engine (${selectedFormat.label})...`);

    const safeTitle = videoInfo.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);

    try {
      // 1. Launch download job on server
      const prepRes = await fetch('/api/youtube/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: videoInfo.standardUrl,
          type: selectedFormat.type,
          quality: selectedFormat.quality,
          filename: safeTitle,
        }),
      });

      if (!prepRes.ok) {
        const errData = await prepRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to start download job on server');
      }

      const { jobId, filename } = await prepRes.json();

      // 2. Poll progress in real-time
      let isDone = false;
      while (!isDone) {
        await new Promise((r) => setTimeout(r, 400));

        const progRes = await fetch(`/api/youtube/progress?id=${jobId}`);
        if (!progRes.ok) {
          throw new Error('Lost connection to download progress');
        }

        const job = await progRes.json();

        if (job.error) {
          throw new Error(job.error);
        }

        setDownloadProgress(job.percent || 5);
        if (job.speed) setDownloadSpeed(job.speed);
        if (job.eta) setDownloadEta(job.eta);
        if (job.totalSize) setDownloadTotalSize(job.totalSize);

        if (job.status === 'merging') {
          setDownloadStatusText('Merging video and audio streams...');
        } else if (job.status === 'downloading') {
          setDownloadStatusText(`Downloading ${selectedFormat.label} stream...`);
        } else if (job.status === 'starting') {
          setDownloadStatusText('Resolving video stream codecs...');
        }

        if (job.status === 'ready') {
          isDone = true;
          setDownloadProgress(100);
          setDownloadStatusText('Transferring file to your Downloads folder...');

          // 3. Trigger native file save directly in browser
          const downloadUrl = `/api/youtube/download?jobId=${jobId}`;
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', job.filename || filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          const finalSize = job.fileSize ? formatBytes(job.fileSize) : job.totalSize || '';
          setDownloadSuccess(
            `"${videoInfo.title}.${selectedFormat.ext}" ${finalSize ? `(${finalSize})` : ''} downloaded successfully!`
          );
        }
      }
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError(err?.message || 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  // Download thumbnail image directly inside app without leaving page
  async function downloadThumbnailImage(imageUrl: string, qualityName: string) {
    if (!videoInfo) return;
    try {
      setIsDownloading(true);
      setDownloadStatusText(`Downloading thumbnail (${qualityName})...`);
      setDownloadProgress(50);
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const filename = `${videoInfo.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40)}_thumb_${qualityName}.jpg`;
      downloadBlob(blob, filename);
      setDownloadProgress(100);
      setDownloadSuccess(`Thumbnail (${qualityName}) downloaded successfully!`);
    } catch {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = `${videoInfo.videoId}_thumb_${qualityName}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadSuccess(`Thumbnail (${qualityName}) downloaded!`);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }

  function copyShareLink() {
    if (!videoInfo) return;
    navigator.clipboard.writeText(videoInfo.standardUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <ToolLayout slug="convert/youtube">
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Input & Search Section (Glassmorphism) */}
        <Card className="border-red-500/20 shadow-lg shadow-red-500/5">
          <CardContent className="p-5 sm:p-7 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                <span>Paste YouTube Video URL, Shorts, or Music Link</span>
              </Label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchVideoInfo();
                    }}
                    className="h-12 text-sm pr-10 rounded-xl"
                  />
                  {urlInput && (
                    <button
                      onClick={() => setUrlInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePaste}
                    className="h-12 px-4 rounded-xl gap-1.5 shrink-0"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                    <span>Paste</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => fetchVideoInfo()}
                    disabled={loading || !urlInput.trim()}
                    className="h-12 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold gap-2 shrink-0 shadow-md shadow-red-500/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Get Video</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Sample Links */}
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-muted-foreground">Try sample:</span>
              {SAMPLE_VIDEOS.map((sample) => (
                <button
                  key={sample.url}
                  onClick={() => {
                    setUrlInput(sample.url);
                    fetchVideoInfo(sample.url);
                  }}
                  className="px-2.5 py-1 rounded-full border border-border/80 bg-background/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all text-muted-foreground font-medium truncate max-w-xs"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Details & Download Options */}
        {videoInfo && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Video Overview Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row gap-6 items-start">
                {/* Thumbnail / Player preview */}
                <div className="relative w-full md:w-72 shrink-0 aspect-video rounded-xl overflow-hidden bg-black shadow-md border group">
                  {!showPlayer ? (
                    <>
                      <img
                        src={videoInfo.thumbnail}
                        alt={videoInfo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={() => setShowPlayer(true)}
                        className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-600/90 text-white shadow-xl hover:scale-110 transition-transform"
                        title="Preview video"
                      >
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </button>
                    </>
                  ) : (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${videoInfo.videoId}?autoplay=1`}
                      title={videoInfo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  )}
                </div>

                {/* Video Info Details */}
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground line-clamp-2">
                      {videoInfo.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <a
                        href={videoInfo.authorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground hover:text-red-500 flex items-center gap-1 transition-colors"
                      >
                        <span>{videoInfo.author}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Actions & Share */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShareLink}
                      className="h-8 text-xs gap-1.5 rounded-lg"
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 text-xs gap-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <a href={videoInfo.standardUrl} target="_blank" rel="noopener noreferrer">
                        <Youtube className="h-3.5 w-3.5 text-red-500" />
                        <span>Watch on YouTube</span>
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Direct In-App Download Card */}
            <Card className="border-primary/20">
              <CardContent className="p-5 sm:p-7 space-y-6">
                {/* Format Tabs */}
                <div className="flex border-b pb-3 gap-2">
                  <Button
                    type="button"
                    variant={activeTab === 'video' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setActiveTab('video');
                      setSelectedFormat({ type: 'video', quality: '720p', ext: 'mp4', label: '720p HD' });
                    }}
                    className="gap-2 rounded-xl"
                  >
                    <Film className="h-4 w-4" />
                    <span>Video (MP4)</span>
                  </Button>

                  <Button
                    type="button"
                    variant={activeTab === 'audio' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setActiveTab('audio');
                      setSelectedFormat({ type: 'audio', quality: '320kbps', ext: 'mp3', label: 'MP3 320 kbps' });
                    }}
                    className="gap-2 rounded-xl"
                  >
                    <Music2 className="h-4 w-4" />
                    <span>Music & Audio (MP3)</span>
                  </Button>

                  <Button
                    type="button"
                    variant={activeTab === 'thumbnail' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('thumbnail')}
                    className="gap-2 rounded-xl"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span>Thumbnail</span>
                  </Button>
                </div>

                {/* Tab: Video Selection */}
                {activeTab === 'video' && (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground font-medium">
                      Select video quality to download:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {videoInfo.videoFormats.map((fmt) => {
                        const isSelected = selectedFormat.type === 'video' && selectedFormat.quality === fmt.quality;
                        return (
                          <div
                            key={fmt.quality}
                            onClick={() => setSelectedFormat({ type: 'video', quality: fmt.quality, ext: fmt.ext, label: fmt.label })}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                                : 'glass-card hover:border-foreground/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {fmt.quality.replace('p', '')}
                              </div>
                              <div>
                                <div className="font-semibold text-sm flex items-center gap-2">
                                  <span>{fmt.label}</span>
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    .{fmt.ext}
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground">{fmt.note}</div>
                              </div>
                            </div>
                            <div
                              className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab: Audio Selection */}
                {activeTab === 'audio' && (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground font-medium">
                      Select audio format and bitrate:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {videoInfo.audioFormats.map((fmt) => {
                        const isSelected = selectedFormat.type === 'audio' && selectedFormat.quality === fmt.quality;
                        return (
                          <div
                            key={fmt.quality}
                            onClick={() => setSelectedFormat({ type: 'audio', quality: fmt.quality, ext: fmt.ext, label: fmt.label })}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/5 shadow-xs'
                                : 'glass-card hover:border-foreground/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  isSelected ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                <Volume2 className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-semibold text-sm flex items-center gap-2">
                                  <span>{fmt.label}</span>
                                  <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                                    {fmt.ext}
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground">{fmt.note}</div>
                              </div>
                            </div>
                            <div
                              className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-muted-foreground/40'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab: Thumbnails */}
                {activeTab === 'thumbnail' && (
                  <div className="space-y-4">
                    <div className="text-xs text-muted-foreground font-medium">
                      Download high-resolution cover art directly:
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-2xl space-y-3 glass-panel">
                        <div className="aspect-video bg-black/5 rounded-xl overflow-hidden border">
                          <img src={videoInfo.thumbnails.maxres} alt="Max Resolution" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs">Max Resolution (1080p)</div>
                            <div className="text-[11px] text-muted-foreground">Original 1920x1080</div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => downloadThumbnailImage(videoInfo.thumbnails.maxres, 'maxres')}
                            disabled={isDownloading}
                            className="rounded-xl font-semibold"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" /> Download JPG
                          </Button>
                        </div>
                      </div>

                      <div className="p-4 border rounded-2xl space-y-3 glass-panel">
                        <div className="aspect-video bg-black/5 rounded-xl overflow-hidden border">
                          <img src={videoInfo.thumbnails.hq} alt="High Quality" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs">High Quality (HQ)</div>
                            <div className="text-[11px] text-muted-foreground">Standard 480x360</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadThumbnailImage(videoInfo.thumbnails.hq, 'hq')}
                            disabled={isDownloading}
                            className="rounded-xl"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" /> Download JPG
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct In-App Download Trigger & Dynamic Real-Time Progress Bar */}
                {activeTab !== 'thumbnail' && (
                  <div className="pt-4 border-t space-y-4">
                    {/* Live Progress Bar Card (Real-Time Backend Tracking) */}
                    {isDownloading && (
                      <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-glass">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                            <span className="truncate">{downloadStatusText}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            {downloadSpeed && (
                              <Badge variant="outline" className="text-[10px] bg-background/60 font-medium">
                                ⚡ {downloadSpeed}
                              </Badge>
                            )}
                            {downloadEta && downloadEta !== '--' && (
                              <Badge variant="outline" className="text-[10px] bg-background/60 font-medium">
                                ⏱️ {downloadEta}
                              </Badge>
                            )}
                            <span className="font-bold text-primary text-sm">{downloadProgress}%</span>
                          </div>
                        </div>

                        {/* Animated Progress Bar Track */}
                        <div className="w-full bg-background/80 rounded-full h-3 p-0.5 overflow-hidden border border-primary/20">
                          <div
                            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 shadow-sm"
                            style={{ width: `${Math.max(3, downloadProgress)}%` }}
                          />
                        </div>

                        {/* Stats indicator */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                          <span>
                            {downloadTotalSize ? `File size: ~${downloadTotalSize}` : 'Preparing stream...'}
                          </span>
                          <span className="text-[10px] font-sans">yt-dlp engine stream</span>
                        </div>
                      </div>
                    )}

                    {/* Download Success Card */}
                    {downloadSuccess && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs flex items-center gap-3 animate-in fade-in">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">Download Finished!</div>
                          <div className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90">{downloadSuccess}</div>
                        </div>
                      </div>
                    )}

                    {/* Download Error Card */}
                    {downloadError && (
                      <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs flex items-center gap-2.5">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{downloadError}</span>
                      </div>
                    )}

                    {/* Big Action Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Ready to Download
                        </div>
                        <div className="text-base font-extrabold text-foreground">
                          {selectedFormat.type === 'video' ? '🎬 MP4 Video' : '🎵 MP3 Audio'}: {selectedFormat.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Direct file download to your browser with real-time transfer tracking.
                        </div>
                      </div>

                      <Button
                        onClick={triggerDirectDownload}
                        disabled={isDownloading}
                        size="lg"
                        className="h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-md shadow-indigo-500/20 gap-2 shrink-0"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Processing ({downloadProgress}%)...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            <span>Download {selectedFormat.label}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recently Converted / Downloaded List */}
        {recentItems.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Recent Videos
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRecentItems([]);
                  localStorage.removeItem('alltools_yt_recent');
                }}
                className="h-6 text-xs text-muted-foreground hover:text-destructive"
              >
                Clear history
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {recentItems.map((item) => (
                <div
                  key={item.videoId}
                  onClick={() => {
                    setUrlInput(`https://www.youtube.com/watch?v=${item.videoId}`);
                    fetchVideoInfo(`https://www.youtube.com/watch?v=${item.videoId}`);
                  }}
                  className="glass-card rounded-xl p-2.5 flex items-center gap-3 cursor-pointer hover:border-red-500/40 transition-all group"
                >
                  <div className="h-12 w-16 bg-black rounded-lg overflow-hidden shrink-0">
                    <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs truncate group-hover:text-red-500 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.author}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
