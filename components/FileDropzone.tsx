'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, X, FileIcon } from 'lucide-react';
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
  label = 'Click or drag files here',
  hint,
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
          setError(`File "${tooLarge.name}" exceeds ${maxSizeMB}MB`);
          return;
        }
      }
      setError(null);
      onFiles(multiple ? arr : [arr[0]]);
    },
    [onFiles, multiple, maxSizeMB]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/40 hover:bg-muted/40'
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Upload className="h-5 w-5" />
        </div>
        <div className="font-medium">{label}</div>
        {hint && <div className="text-sm text-muted-foreground">{hint}</div>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {files && files.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{f.name}</span>
                <span className="text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
              </div>
              {onRemove && (
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onRemove(i); }} aria-label="Remove">
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
