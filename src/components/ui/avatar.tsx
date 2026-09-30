'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({ src, alt, fallback, size = 'md', className, ...props }: AvatarProps) {
  const [error, setError] = React.useState(false);

  const initials = React.useMemo(() => {
    if (!fallback) return '?';
    return fallback
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [fallback]);

  return (
    <div
      className={cn('relative inline-flex shrink-0 overflow-hidden rounded-full', sizeClasses[size], className)}
      {...props}
    >
      {src && !error ? (
        <img src={src} alt={alt || fallback || 'Avatar'} className="aspect-square h-full w-full object-cover" onError={() => setError(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
          {initials}
        </div>
      )}
    </div>
  );
}

export function AvatarImage({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img src={src} alt={alt} {...props} />;
}

export function AvatarFallback({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800" {...props}>{children}</div>;
}