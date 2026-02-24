'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  theme?: 'dark' | 'light' | 'landing';
}

export function AppShell({
  children,
  title,
  subtitle,
  backHref = '/',
  backLabel = 'Home',
  actions,
  theme = 'dark',
}: AppShellProps) {
  const isLight = theme === 'light';
  const isLanding = theme === 'landing';

  return (
    <div
      className={cn(
        'min-h-screen',
        isLight && 'bg-slate-50 text-slate-900',
        !isLight && !isLanding && 'bg-gradient-dark',
        isLanding && 'landing-gradient text-[var(--landing-text)]'
      )}
    >
      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            {backHref && (
              <Link
                href={backHref}
                className={cn(
                  'mb-1 inline-block text-sm font-medium transition-colors',
                  isLight && 'text-slate-600 hover:text-slate-900',
                  !isLight && !isLanding && 'text-gray-400 hover:text-white',
                  isLanding && 'text-[var(--landing-muted)] hover:text-[var(--landing-text)]'
                )}
              >
                ← {backLabel}
              </Link>
            )}
            <h1
              className={cn(
                'truncate text-xl font-semibold tracking-tight sm:text-2xl',
                isLight && 'text-slate-900',
                !isLight && !isLanding && 'text-white',
                isLanding && 'text-[var(--landing-text)]'
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className={cn(
                  'mt-0.5 truncate text-sm font-medium',
                  isLight && 'text-slate-600',
                  !isLight && !isLanding && 'text-gray-400',
                  isLanding && 'text-[var(--landing-muted)]'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
