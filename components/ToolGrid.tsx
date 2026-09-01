'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, ArrowRight, Star, X, Sparkles, Filter,
  Layers, Check, Eye
} from 'lucide-react';
import {
  categories,
  searchTools,
  toolsByCategory,
  tools,
  type ToolCategory,
  type Tool,
} from '@/lib/tools-registry';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function ToolGrid() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('alltools_favorites');
      if (saved) setFavorites(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  function toggleFavorite(slug: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem('alltools_favorites', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Filter tools based on query & category
  const filteredTools = useMemo(() => {
    let result = searchTools(query);
    if (selectedCategory === 'favorites') {
      result = result.filter((t) => favorites.includes(t.slug));
    } else if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory);
    }
    return result;
  }, [query, selectedCategory, favorites]);

  const hasSearch = query.trim().length > 0;
  const totalCount = tools.length;

  return (
    <div className="space-y-8">
      {/* Search & Filter Header Container */}
      <div className="space-y-5 max-w-4xl mx-auto">
        {/* Glassmorphism Search Input */}
        <div className="relative group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-md opacity-70 group-hover:opacity-100 transition duration-300" />
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              type="search"
              placeholder="Search tools... (e.g. merge pdf, edit pdf, remove background, qr, json)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="glass-input pl-12 pr-12 h-14 text-base rounded-2xl border-border/60 text-foreground placeholder:text-muted-foreground/70"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Category Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none justify-start md:justify-center flex-nowrap md:flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                : 'glass-card text-muted-foreground hover:text-foreground hover:bg-card/90'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>All Tools</span>
            <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'all' ? 'bg-white/20' : 'bg-muted'}`}>
              {totalCount}
            </span>
          </button>

          {mounted && favorites.length > 0 && (
            <button
              onClick={() => setSelectedCategory('favorites')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === 'favorites'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-[1.02]'
                  : 'glass-card text-muted-foreground hover:text-foreground hover:bg-card/90'
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>Starred</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'favorites' ? 'bg-white/20' : 'bg-muted'}`}>
                {favorites.length}
              </span>
            </button>
          )}

          {(Object.keys(categories) as ToolCategory[]).map((cat) => {
            const meta = categories[cat];
            const count = toolsByCategory(cat).length;
            const Icon = meta.icon;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                    : 'glass-card text-muted-foreground hover:text-foreground hover:bg-card/90'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{meta.name}</span>
                <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20' : 'bg-muted'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Content Display */}
      {hasSearch || selectedCategory !== 'all' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 border-b pb-2">
            <span>
              Showing <strong className="text-foreground">{filteredTools.length}</strong> {filteredTools.length === 1 ? 'tool' : 'tools'}
              {hasSearch && <span> for &ldquo;{query}&rdquo;</span>}
            </span>
            {(hasSearch || selectedCategory !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setSelectedCategory('all');
                }}
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset filters
              </Button>
            )}
          </div>

          {filteredTools.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-2xl border-dashed">
              <p className="text-sm font-medium text-muted-foreground">No tools found matching your criteria.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-3 text-xs"
              >
                View all tools
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.slug}
                  tool={tool}
                  isFavorite={favorites.includes(tool.slug)}
                  onToggleFavorite={(e) => toggleFavorite(tool.slug, e)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Categorized sections display when no search is active */
        <div className="space-y-12">
          {(Object.keys(categories) as ToolCategory[]).map((cat) => {
            const list = toolsByCategory(cat);
            if (list.length === 0) return null;
            const meta = categories[cat];
            const Icon = meta.icon;

            return (
              <section key={cat} id={cat} className="scroll-mt-24 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color} text-white shadow-md shadow-indigo-500/10`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-foreground">{meta.name}</h2>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {list.length} tools
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
                  {list.map((tool) => (
                    <ToolCard
                      key={tool.slug}
                      tool={tool}
                      isFavorite={favorites.includes(tool.slug)}
                      onToggleFavorite={(e) => toggleFavorite(tool.slug, e)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToolCard({
  tool,
  isFavorite,
  onToggleFavorite,
}: {
  tool: Tool;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  const Icon = tool.icon;
  const isSoon = tool.status === 'soon';
  const cat = categories[tool.category];

  return (
    <Link
      href={isSoon ? '#' : `/${tool.slug}`}
      className={`group relative flex flex-col justify-between rounded-2xl glass-card p-5 transition-all duration-300 ${
        isSoon ? 'pointer-events-none opacity-50' : 'cursor-pointer'
      }`}
      aria-disabled={isSoon}
    >
      <div className="space-y-3.5">
        {/* Card Header: Icon & Status / Favorite */}
        <div className="flex items-start justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${
              cat ? cat.color : 'from-indigo-500 to-purple-500'
            } text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex items-center gap-1.5">
            {tool.status === 'beta' && (
              <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                Beta
              </Badge>
            )}
            {tool.status === 'soon' && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider px-2 py-0.5">
                Soon
              </Badge>
            )}
            <button
              onClick={onToggleFavorite}
              className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                isFavorite
                  ? 'text-amber-500 hover:text-amber-600 bg-amber-500/10'
                  : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 opacity-0 group-hover:opacity-100'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Star this tool'}
            >
              <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Name & Description */}
        <div className="space-y-1">
          <h3 className="font-bold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
            {tool.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-normal">
            {tool.description}
          </p>
        </div>
      </div>

      {/* Card Footer: Category tag & Action link */}
      <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
        <span className="text-[11px] font-medium text-muted-foreground/80 lowercase">
          #{tool.category}
        </span>
        <div className="flex items-center font-semibold text-primary/80 group-hover:text-primary transition-colors">
          <span>Open</span>
          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
