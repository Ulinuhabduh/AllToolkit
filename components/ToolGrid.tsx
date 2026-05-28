'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';
import { categories, searchTools, toolsByCategory, type ToolCategory, type Tool } from '@/lib/tools-registry';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function ToolGrid() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => searchTools(query), [query]);
  const showSearchResults = query.trim().length > 0;

  return (
    <div className="space-y-12">
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search tools... (e.g. remove background, json, pdf merge)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {showSearchResults ? (
        <section>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-4">
            {filtered.length} results for "{query}"
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}
          </div>
        </section>
      ) : (
        (Object.keys(categories) as ToolCategory[]).map((cat) => {
          const list = toolsByCategory(cat);
          if (list.length === 0) return null;
          const meta = categories[cat];
          const Icon = meta.icon;
          return (
            <section key={cat} id={cat} className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${meta.color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{meta.name}</h2>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {list.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const isSoon = tool.status === 'soon';
  return (
    <Link
      href={isSoon ? '#' : `/${tool.slug}`}
      className={`group relative flex flex-col gap-3 rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-foreground/20 ${isSoon ? 'pointer-events-none opacity-60' : ''}`}
      aria-disabled={isSoon}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="h-5 w-5" />
        </div>
        {tool.status === 'beta' && <Badge variant="warning">Beta</Badge>}
        {tool.status === 'soon' && <Badge variant="outline">Soon</Badge>}
      </div>
      <div>
        <h3 className="font-semibold leading-tight">{tool.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{tool.description}</p>
      </div>
      <div className="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        Open <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
