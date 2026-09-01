import { ToolGrid } from '@/components/ToolGrid';
import { tools } from '@/lib/tools-registry';
import { Sparkles, Shield, Zap, Lock, Cpu, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const totalReady = tools.filter((t) => t.status !== 'soon').length;

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-8 md:pt-20 md:pb-14 text-center">
        <div className="container relative max-w-4xl mx-auto px-4">
          {/* Large Hero Logo Badge */}
          <div className="flex justify-center mb-8 relative">
            {/* Ambient Glow Behind Logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 sm:w-56 md:w-64 h-44 sm:h-56 md:h-64 bg-gradient-to-tr from-indigo-500/30 via-purple-500/20 to-pink-500/30 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-subtle" />
            
            <div className="relative flex h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44 items-center justify-center rounded-[2.5rem] glass-card border border-white/30 dark:border-white/15 p-4 sm:p-5 shadow-glass-lg shadow-indigo-500/15 hover:shadow-indigo-500/30 hover:scale-105 transition-all duration-500 group">
              <img
                src="/logo.png"
                alt="AllTools"
                className="h-full w-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 dark:bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6 backdrop-blur-md shadow-xs animate-pulse-subtle">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{totalReady}+ Free Tools • 100% In-Browser Privacy • Zero Server Upload</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            All the tools you need,{' '}
            <span className="text-gradient">all in one place.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            Merge, Edit & Split PDFs, Remove Backgrounds, Convert Media, Format JSON, and dozens of browser-native utilities.
            Fast, secure, and completely free.
          </p>

          {/* Key Value Props Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl mx-auto mb-10">
            <div className="glass-panel rounded-2xl p-3.5 flex items-center gap-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Lock className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="text-xs font-bold text-foreground">100% Private</div>
                <div className="text-[11px] text-muted-foreground">Files never leave browser</div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-3.5 flex items-center gap-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Zap className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="text-xs font-bold text-foreground">Instant Speed</div>
                <div className="text-[11px] text-muted-foreground">Client-side WebAssembly</div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-3.5 flex items-center gap-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="text-xs font-bold text-foreground">Always Free</div>
                <div className="text-[11px] text-muted-foreground">No limits or watermarks</div>
              </div>
            </div>
          </div>

          {/* Trending Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium mr-1">Trending:</span>
            {[
              { label: 'Edit PDF', href: '/pdf/edit' },
              { label: 'Merge PDF', href: '/pdf/merge' },
              { label: 'Cut PDF', href: '/pdf/cut' },
              { label: 'Split PDF', href: '/pdf/split' },
              { label: 'Remove BG', href: '/image/remove-bg' },
              { label: 'QR Generator', href: '/dev/qr' },
              { label: 'Business Card', href: '/design/business-card' },
            ].map((chip) => (
              <Link
                key={chip.href}
                href={chip.href}
                className="px-3 py-1 rounded-full border border-border/80 bg-background/60 hover:bg-primary/10 hover:border-primary/40 hover:text-primary backdrop-blur-xs transition-all text-muted-foreground font-medium"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Tool Grid Section */}
      <section className="container pb-20">
        <ToolGrid />
      </section>
    </div>
  );
}
