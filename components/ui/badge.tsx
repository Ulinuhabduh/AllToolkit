import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-xs',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow-xs',
        secondary: 'border-border/60 bg-secondary/80 text-secondary-foreground',
        destructive: 'border-destructive/20 bg-destructive/15 text-destructive font-bold',
        outline: 'border-border/80 text-foreground bg-background/50',
        success: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold',
        warning: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
