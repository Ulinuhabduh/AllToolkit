'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Moon, Sun, Sparkles, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span>AllTools</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/#image" className="text-muted-foreground hover:text-foreground transition-colors">Image</Link>
          <Link href="/#pdf" className="text-muted-foreground hover:text-foreground transition-colors">PDF</Link>
          <Link href="/#convert" className="text-muted-foreground hover:text-foreground transition-colors">Convert</Link>
          <Link href="/#dev" className="text-muted-foreground hover:text-foreground transition-colors">Developer</Link>
          <Link href="/#text" className="text-muted-foreground hover:text-foreground transition-colors">Text</Link>
          <Link href="/#utility" className="text-muted-foreground hover:text-foreground transition-colors">Utility</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {mounted && theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="GitHub">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer"><Github className="h-4 w-4" /></a>
          </Button>
        </div>
      </div>
    </header>
  );
}
