// Dashboard reads auth state — always dynamic
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import type { Profile } from '@/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar profile={profile as Profile | null} />
      {/* Main content — offset by sidebar width on desktop */}
      <main className="flex-1 lg:pl-60 min-w-0">
        <div className="p-6 lg:p-8 max-w-screen-2xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
