import Link from 'next/link';
import { ChevronRight, Shield } from 'lucide-react';
import { getTool, categories } from '@/lib/tools-registry';
import { Badge } from '@/components/ui/badge';

interface ToolLayoutProps {
  slug: string;
  children: React.ReactNode;
  hidePrivacyNote?: boolean;
}

export function ToolLayout({ slug, children, hidePrivacyNote }: ToolLayoutProps) {
  const tool = getTool(slug);
  if (!tool) {
    return <div className="container py-10">Tool not found.</div>;
  }
  const cat = categories[tool.category];
  const Icon = tool.icon;

  return (
    <div className="container py-8 max-w-5xl">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/#${tool.category}`} className="hover:text-foreground">{cat.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{tool.name}</span>
      </nav>

      <div className="flex items-start gap-4 mb-2">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} text-white`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{tool.name}</h1>
            {tool.status === 'beta' && <Badge variant="warning">Beta</Badge>}
          </div>
          <p className="text-muted-foreground mt-1">{tool.description}</p>
        </div>
      </div>

      {!hidePrivacyNote && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground my-4 p-3 rounded-lg border bg-muted/40">
          <Shield className="h-3.5 w-3.5" />
          Your files are processed entirely in your browser. Nothing is uploaded to a server.
        </div>
      )}

      <div className="mt-6">{children}</div>
    </div>
  );
}
