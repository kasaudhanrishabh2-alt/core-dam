import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ profile });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body: { full_name?: string; avatar_url?: string } = await request.json();

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      ...(body.full_name !== undefined ? { full_name: body.full_name } : {}),
      ...(body.avatar_url !== undefined ? { avatar_url: body.avatar_url } : {}),
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ profile });
}
