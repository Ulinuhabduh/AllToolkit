import { ToolGrid } from '@/components/ToolGrid';
import { tools } from '@/lib/tools-registry';
import { Sparkles } from 'lucide-react';

export default function HomePage() {
  const totalReady = tools.filter((t) => t.status !== 'soon').length;

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="absolute inset-0 bg-radial-fade" />
        <div className="container relative py-16 md:py-24 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur px-3 py-1 text-xs font-medium mb-6">
            <Sparkles className="h-3 w-3" />
            {totalReady}+ tools • 100% free • no server upload
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Every tool you need,
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent"> in one place.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Remove Background, Image Enhancer, PDF Tools, File Converter, and dozens of other utilities.
            Fast, free, and privacy-safe — everything runs in your browser.
          </p>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <ToolGrid />
      </section>
    </>
  );
}
