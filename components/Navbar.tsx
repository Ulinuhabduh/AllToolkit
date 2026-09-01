'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Sun, Sparkles, Github, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '/#pdf', label: 'PDF Tools' },
  { href: '/#image', label: 'Image' },
  { href: '/#convert', label: 'Convert' },
  { href: '/#dev', label: 'Developer' },
  { href: '/#design', label: 'Design' },
  { href: '/#text', label: 'Text' },
  { href: '/#utility', label: 'Utility' },
];

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 w-full glass-nav transition-all duration-300">
      <div className="container flex h-16 items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-background/50 border border-border/50 p-1 shadow-sm shadow-indigo-500/10 group-hover:scale-105 group-hover:shadow-indigo-500/30 transition-all duration-300 overflow-hidden">
            <img src="/logo.png" alt="AllTools Logo" className="h-full w-full object-contain rounded-lg" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
              AllTools
            </span>
            <span className="text-[10px] font-medium text-muted-foreground tracking-wide">
              Privacy-First Toolkit
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm bg-muted/30 dark:bg-card/40 p-1 rounded-full border border-white/10 dark:border-white/5 backdrop-blur-md">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 dark:hover:bg-white/10 transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Privacy badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>100% Client-Side</span>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="h-9 w-9 rounded-xl hover:bg-muted/50 transition-colors"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 rotate-0 scale-100 transition-transform" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-500 rotate-0 scale-100 transition-transform" />
            )}
          </Button>

          {/* GitHub Link */}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="hidden sm:inline-flex rounded-xl border-border/60 bg-background/50 backdrop-blur hover:bg-background h-9 text-xs font-medium gap-1.5"
          >
            <a href="https://github.com/Ulinuhabduh/AllToolkit" target="_blank" rel="noopener noreferrer">
              <Github className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
