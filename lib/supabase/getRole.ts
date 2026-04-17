import { createClient } from '@supabase/supabase-js';

/** Fetches a user's role using the service key (bypasses RLS). */
export async function getUserRole(userId: string): Promise<string | null> {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await service
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role ?? null;
}
