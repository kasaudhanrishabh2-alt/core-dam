// Dashboard reads auth state — always dynamic
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import type { Profile } from '@/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar profile={profile as Profile | null} />
      <div className="flex-1 lg:pl-60 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1">
          <div className="p-6 lg:p-8 max-w-screen-2xl mx-auto page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
