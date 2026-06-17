import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const db = () => createAdminClient();
const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
async function requireAuth() { const s = await createClient(); const { data: { user } } = await s.auth.getUser(); return user; }

export async function GET(request: NextRequest) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { searchParams } = request.nextUrl;
  const q = (searchParams.get('q') ?? '').slice(0, 100);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));
  const offset = (page - 1) * limit;

  let query = db().from('contacts').select('*, bookings(count)', { count: 'exact' }).order('name');
  if (q) query = query.ilike('name', `%${q}%`);
  if (limit > 0) query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ data, total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body.name?.trim()) return json({ error: 'Name is required' }, 400);
  const { data, error } = await db().from('contacts').insert({ name: body.name.trim(), email: body.email ?? null, phone: body.phone ?? null, address: body.address ?? null }).select().single();
  if (error) return json({ error: error.message }, 500);
  return json(data, 201);
}
