'use client';

import { usePathname } from 'next/navigation';
import { Search, Upload, Bell } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/assets':    { title: 'Asset Library',    subtitle: 'All creatives, brochures, videos and documents across projects' },
  '/search':    { title: 'Search & Q&A',     subtitle: 'Find assets by project, launch or topic — or ask AI' },
  '/links':     { title: 'Share Links',      subtitle: 'Send trackable collateral to prospects and track engagement' },
  '/insights':  { title: 'Intelligence',     subtitle: 'AI-generated insights from your marketing library' },
  '/analytics': { title: 'Analytics',        subtitle: 'Asset performance, engagement, and Salesforce attribution' },
  '/settings':  { title: 'Settings',         subtitle: 'Profile, integrations, and preferences' },
};

function getPageMeta(pathname: string) {
  for (const [key, meta] of Object.entries(PAGE_META)) {
    if (pathname.startsWith(key)) return meta;
  }
  return { title: 'CORE', subtitle: undefined };
}

interface TopBarProps {
  onUpload?: () => void;
}

export function TopBar({ onUpload }: TopBarProps) {
  const pathname = usePathname();
  const meta = getPageMeta(pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3.5 glass border-b"
            style={{ borderColor: 'var(--border)' }}>
      {/* Page title */}
      <div className="min-w-0 flex-1">
        <h1 className="text-[15px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>
          {meta.title}
        </h1>
        {meta.subtitle && (
          <p className="text-xs truncate mt-px hidden sm:block" style={{ color: 'var(--muted-foreground)' }}>
            {meta.subtitle}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        {/* Search shortcut */}
        <Link
          href="/search"
          className={cn(
            'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
            'border',
          )}
          style={{
            background: 'var(--muted)',
            borderColor: 'var(--border)',
            color: 'var(--muted-foreground)',
          }}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Ask AI…</span>
          <kbd className="ml-1 px-1 py-px rounded text-[10px] font-mono hidden lg:block"
               style={{ background: 'var(--background)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
            /
          </kbd>
        </Link>

        {/* Upload shortcut — only on assets page */}
        {pathname.startsWith('/assets') && onUpload && (
          <button
            onClick={onUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 shadow-sm hover:shadow"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        )}
      </div>
    </header>
  );
}
