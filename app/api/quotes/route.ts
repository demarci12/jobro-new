import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { LineItemSchema, json } from '@/lib/schemas';
import { z } from 'zod';
import { type NextRequest } from 'next/server';

async function requireAuth() { const s = await createClient(); const { data: { user } } = await s.auth.getUser(); return user; }

export async function GET() {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { data, error } = await createAdminClient()
    .from('quotes')
    .select('*, bookings(start_time, contacts(name))')
    .order('created_at', { ascending: false });
  if (error) return json({ error: error.message }, 500);
  return json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (typeof body !== 'object' || body === null || !('booking_id' in body)) {
    return json({ error: 'booking_id required' }, 400);
  }
  const { booking_id, line_items, notes } = body as Record<string, unknown>;
  if (typeof booking_id !== 'string') return json({ error: 'booking_id must be a string' }, 400);
  const items = z.array(LineItemSchema).max(100).safeParse(line_items ?? []);
  if (!items.success) return json({ error: items.error.issues.map(i => i.message).join(', ') }, 400);
  const total = items.data.reduce((s, li) => s + li.qty * li.unit_price, 0);
  const { data, error } = await createAdminClient()
    .from('quotes')
    .insert({ booking_id, line_items: items.data, total, status: 'draft', notes: notes ?? null })
    .select()
    .single();
  if (error) return json({ error: error.message }, 500);
  return json(data, 201);
}
