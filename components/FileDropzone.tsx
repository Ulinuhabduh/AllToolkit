'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, X, FileIcon, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FileDropzoneProps {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  className?: string;
  files?: File[];
  onRemove?: (idx: number) => void;
  maxSizeMB?: number;
}

export function FileDropzone({
  accept,
  multiple = false,
  onFiles,
  label = 'Click or drag & drop files here',
  hint = 'Secure client-side processing • Files stay in your browser',
  className,
  files,
  onRemove,
  maxSizeMB,
}: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const arr = Array.from(list);
      if (maxSizeMB) {
        const tooLarge = arr.find((f) => f.size > maxSizeMB * 1024 * 1024);
        if (tooLarge) {
          setError(`File "${tooLarge.name}" exceeds maximum allowed size of ${maxSizeMB}MB`);
          return;
        }
      }
      setError(null);
      onFiles(multiple ? arr : [arr[0]]);
    },
    [onFiles, multiple, maxSizeMB]
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center cursor-pointer transition-all duration-300 glass-panel',
          dragging
            ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10 scale-[0.99]'
            : 'border-border/80 hover:border-primary/50 hover:bg-card/80 hover:shadow-md'
        )}
      >
        {/* Animated Glowing Upload Icon */}
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/20 via-purple-500/15 to-primary/10 text-primary border border-primary/20 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3',
            dragging ? 'scale-110 ring-4 ring-primary/20' : ''
          )}
        >
          <Upload className="h-7 w-7 transition-transform group-hover:-translate-y-0.5" />
        </div>

        <div className="space-y-1">
          <div className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
            {label}
          </div>
          {hint && <div className="text-xs text-muted-foreground max-w-sm mx-auto">{hint}</div>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
          {error}
        </div>
      )}

      {files && files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="glass-card flex items-center justify-between gap-3 p-3.5 rounded-xl text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs truncate block">{f.name}</span>
                  <span className="text-[11px] text-muted-foreground">{formatBytes(f.size)}</span>
                </div>
              </div>

              {onRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(i);
                  }}
                  aria-label="Remove"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
