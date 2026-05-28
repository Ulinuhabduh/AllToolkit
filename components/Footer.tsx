import { Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-20">
      <div className="container py-10 text-sm text-muted-foreground">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-foreground">AllTools</span>
            <span>— All-in-one online toolkit</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🔒 All files are processed in your browser. Nothing is uploaded to a server.</span>
          </div>
        </div>
        <div className="mt-4 text-xs">© {new Date().getFullYear()} AllTools. Built with Next.js.</div>
      </div>
    </footer>
  );
}
