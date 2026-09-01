import { Sparkles, ShieldCheck, Heart, Github } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-24 glass-panel">
      <div className="container py-12 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
          {/* Col 1: Brand & statement */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-base group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-background/60 border border-border/50 p-0.5 shadow-sm overflow-hidden">
                <img src="/logo.png" alt="AllTools Logo" className="h-full w-full object-contain rounded-lg" />
              </div>
              <span className="text-foreground tracking-tight font-extrabold">AllTools</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              A modern, privacy-first all-in-one web toolkit. Every file operation runs 100% inside your browser with zero server uploads and zero tracking.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Safe & Secure Client-Side Execution</span>
            </div>
          </div>

          {/* Col 2: PDF Tools */}
          <div className="space-y-2.5 text-xs">
            <div className="font-bold text-foreground uppercase tracking-wider text-[11px]">PDF Tools</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><Link href="/pdf/merge" className="hover:text-foreground transition-colors">Merge PDF</Link></li>
              <li><Link href="/pdf/edit" className="hover:text-foreground transition-colors">Edit PDF</Link></li>
              <li><Link href="/pdf/cut" className="hover:text-foreground transition-colors">Cut / Remove Pages</Link></li>
              <li><Link href="/pdf/split" className="hover:text-foreground transition-colors">Split PDF</Link></li>
              <li><Link href="/pdf/compress" className="hover:text-foreground transition-colors">Compress PDF</Link></li>
              <li><Link href="/pdf/ocr" className="hover:text-foreground transition-colors">PDF OCR</Link></li>
            </ul>
          </div>

          {/* Col 3: Image & Converter */}
          <div className="space-y-2.5 text-xs">
            <div className="font-bold text-foreground uppercase tracking-wider text-[11px]">Media & Images</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><Link href="/image/remove-bg" className="hover:text-foreground transition-colors">Remove Background</Link></li>
              <li><Link href="/image/enhance" className="hover:text-foreground transition-colors">Image Enhancer</Link></li>
              <li><Link href="/image/compress" className="hover:text-foreground transition-colors">Compress Image</Link></li>
              <li><Link href="/convert/audio" className="hover:text-foreground transition-colors">Audio Converter</Link></li>
              <li><Link href="/convert/video" className="hover:text-foreground transition-colors">Video Converter</Link></li>
              <li><Link href="/convert/document" className="hover:text-foreground transition-colors">Document Converter</Link></li>
            </ul>
          </div>

          {/* Col 4: Dev & Design */}
          <div className="space-y-2.5 text-xs">
            <div className="font-bold text-foreground uppercase tracking-wider text-[11px]">Dev & Design</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><Link href="/dev/json" className="hover:text-foreground transition-colors">JSON Formatter</Link></li>
              <li><Link href="/dev/qr" className="hover:text-foreground transition-colors">QR Generator</Link></li>
              <li><Link href="/dev/base64" className="hover:text-foreground transition-colors">Base64 Converter</Link></li>
              <li><Link href="/design/business-card" className="hover:text-foreground transition-colors">Business Card</Link></li>
              <li><Link href="/design/invoice" className="hover:text-foreground transition-colors">Invoice Generator</Link></li>
              <li><Link href="/utility/password" className="hover:text-foreground transition-colors">Password Generator</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} AllTools. Built with Next.js & Tailwind CSS.</div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Ulinuhabduh/AllToolkit"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Github className="h-3.5 w-3.5" /> GitHub Repository
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
