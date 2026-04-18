'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderOpen, Search, Link2, BarChart3, Lightbulb,
  Settings, LogOut, Zap, Menu, X,
} from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Profile } from '@/types';

const navSections = [
  {
    label: 'Library',
    items: [
      { href: '/assets', label: 'Assets', icon: FolderOpen },
      { href: '/search', label: 'Search & Q&A', icon: Search },
    ],
  },
  {
    label: 'Engage',
    items: [
      { href: '/links', label: 'Share Links', icon: Link2 },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/insights', label: 'Insights', icon: Lightbulb },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
];

interface SidebarProps {
  profile: Profile | null;
}

function NavContent({
  profile,
  pathname,
  onNav,
  onSignOut,
}: {
  profile: Profile | null;
  pathname: string;
  onNav: () => void;
  onSignOut: () => void;
}) {
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (profile?.email?.[0] ?? 'U').toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-none tracking-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>CORE</p>
            <p className="text-[10px] font-medium tracking-widest uppercase mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>DAM Platform</p>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 pb-3 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
               style={{ color: 'rgba(255,255,255,0.22)' }}>
              {section.label}
            </p>
            <div className="space-y-px">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNav}
                    className={cn(
                      'group flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150',
                    )}
                    style={{
                      background: active ? 'rgba(99,102,241,0.18)' : undefined,
                      color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.72)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = '';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                      }
                    }}
                  >
                    <Icon
                      className="w-4 h-4 flex-shrink-0 transition-colors"
                      strokeWidth={active ? 2 : 1.75}
                      style={{ color: active ? '#818cf8' : 'rgba(255,255,255,0.28)' }}
                    />
                    <span className="flex-1 truncate">{label}</span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: '#818cf8' }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 px-3 pb-3 space-y-px" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="pt-3">
          <Link
            href="/settings"
            onClick={onNav}
            className="group flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150"
            style={{
              background: pathname.startsWith('/settings') ? 'rgba(99,102,241,0.18)' : undefined,
              color: pathname.startsWith('/settings') ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)',
            }}
            onMouseEnter={(e) => {
              if (!pathname.startsWith('/settings')) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.72)';
              }
            }}
            onMouseLeave={(e) => {
              if (!pathname.startsWith('/settings')) {
                e.currentTarget.style.background = '';
                e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
              }
            }}
          >
            <Settings className="w-4 h-4 flex-shrink-0"
                       strokeWidth={pathname.startsWith('/settings') ? 2 : 1.75}
                       style={{ color: pathname.startsWith('/settings') ? '#818cf8' : 'rgba(255,255,255,0.28)' }} />
            Settings
          </Link>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-lg"
             style={{ background: 'rgba(255,255,255,0.04)' }}>
          <Avatar className="w-7 h-7 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] font-bold"
                            style={{ background: 'rgba(99,102,241,0.35)', color: '#c7d2fe' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate leading-none"
               style={{ color: 'rgba(255,255,255,0.75)' }}>
              {profile?.full_name ?? profile?.email ?? 'User'}
            </p>
            <p className="text-[10px] capitalize leading-none mt-0.5"
               style={{ color: 'rgba(255,255,255,0.28)' }}>
              {profile?.role?.replace(/_/g, ' ') ?? 'viewer'}
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="p-1 rounded-md transition-all"
            style={{ color: 'rgba(255,255,255,0.22)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.22)'; e.currentTarget.style.background = ''; }}
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const sidebarBg = { background: 'var(--sidebar)' } as React.CSSProperties;

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-3.5 left-4 z-50 lg:hidden p-2 rounded-lg shadow-md transition-all"
        style={{ background: 'var(--sidebar)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen
          ? <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
          : <Menu className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
        }
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-60 lg:hidden transform transition-transform duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={sidebarBg}
      >
        <NavContent profile={profile} pathname={pathname} onNav={() => setMobileOpen(false)} onSignOut={handleSignOut} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0" style={sidebarBg}>
        <NavContent profile={profile} pathname={pathname} onNav={() => {}} onSignOut={handleSignOut} />
      </aside>
    </>
  );
}
