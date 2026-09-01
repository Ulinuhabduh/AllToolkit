import Link from 'next/link';
import { ChevronRight, ShieldCheck, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { getTool, categories, toolsByCategory } from '@/lib/tools-registry';
import { Badge } from '@/components/ui/badge';

interface ToolLayoutProps {
  slug: string;
  children: React.ReactNode;
  hidePrivacyNote?: boolean;
}

export function ToolLayout({ slug, children, hidePrivacyNote }: ToolLayoutProps) {
  const tool = getTool(slug);
  if (!tool) {
    return <div className="container py-12 text-center text-muted-foreground">Tool not found.</div>;
  }
  const cat = categories[tool.category];
  const Icon = tool.icon;
  const relatedTools = toolsByCategory(tool.category).filter((t) => t.slug !== slug).slice(0, 4);

  return (
    <div className="container py-8 max-w-5xl space-y-6">
      {/* Top Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          href="/"
          className="hover:text-foreground px-2.5 py-1 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <Link
          href={`/#${tool.category}`}
          className="hover:text-foreground px-2.5 py-1 rounded-lg hover:bg-muted/50 transition-colors"
        >
          {cat.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-foreground font-semibold px-2 py-0.5 rounded-md bg-muted/60">
          {tool.name}
        </span>
      </nav>

      {/* Tool Header Card (Glassmorphism) */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.color} text-white shadow-lg shadow-indigo-500/20`}
          >
            <Icon className="h-7 w-7" />
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {tool.name}
              </h1>
              {tool.status === 'beta' && (
                <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-wider px-2">
                  Beta
                </Badge>
              )}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground font-medium">
                #{tool.category}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
          </div>
        </div>

        {/* Subtle Ambient Background Light */}
        <div
          className={`absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gradient-to-br ${cat.color} opacity-15 blur-3xl pointer-events-none`}
        />
      </div>

      {/* Privacy Notice Pill */}
      {!hidePrivacyNote && (
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 backdrop-blur-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Client-Side Security:</strong> Your files are processed entirely in your browser using WebAssembly & Canvas. Nothing is ever uploaded to a server.
          </span>
        </div>
      )}

      {/* Tool Content / Workspace */}
      <div className="mt-6">{children}</div>

      {/* Related Category Tools Strip */}
      {relatedTools.length > 0 && (
        <div className="pt-10 mt-12 border-t border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> More {cat.name}
            </span>
            <Link
              href={`/#${tool.category}`}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {relatedTools.map((rt) => {
              const RtIcon = rt.icon;
              return (
                <Link
                  key={rt.slug}
                  href={`/${rt.slug}`}
                  className="glass-card rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition-all group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground group-hover:text-primary transition-colors">
                    <RtIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                      {rt.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {rt.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
