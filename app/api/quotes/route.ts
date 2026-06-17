import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { type NextRequest, NextResponse } from 'next/server';

const db = () => createAdminClient();
const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
async function requireAuth() { const s = await createClient(); const { data: { user } } = await s.auth.getUser(); return user; }

const LineItemSchema = z.object({ description: z.string(), qty: z.number().positive(), unit_price: z.number().min(0) });

export async function GET() {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { data, error } = await db().from('quotes').select('*, bookings(start_time, contacts(name))').order('created_at', { ascending: false });
  if (error) return json({ error: error.message }, 500);
  return json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body.booking_id) return json({ error: 'booking_id required' }, 400);
  const items = z.array(LineItemSchema).safeParse(body.line_items ?? []);
  if (!items.success) return json({ error: items.error.issues.map(i => i.message).join(", ") }, 400);
  const total = items.data.reduce((s, li) => s + li.qty * li.unit_price, 0);
  const { data, error } = await db().from('quotes').insert({ booking_id: body.booking_id, line_items: items.data, total, status: 'draft', notes: body.notes ?? null }).select().single();
  if (error) return json({ error: error.message }, 500);
  return json(data, 201);
}
