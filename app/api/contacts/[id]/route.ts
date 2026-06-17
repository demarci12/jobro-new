import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const db = () => createAdminClient();
const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const { id } = await params;
  const supabase = db();
  const [{ data: contact }, { data: bookings, count }] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', id).single(),
    supabase.from('bookings').select('*, workers(name), service_types(name), quotes(id,status)', { count: 'exact' }).eq('contact_id', id).order('start_time', { ascending: false }).limit(20),
  ]);
  if (!contact) return json({ error: 'Not found' }, 404);
  return json({ contact, bookings: { data: bookings ?? [], total: count ?? 0 } });
}
