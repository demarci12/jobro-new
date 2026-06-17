import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { type NextRequest, NextResponse } from 'next/server';

const db = () => createAdminClient();
const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
async function requireAuth() { const s = await createClient(); const { data: { user } } = await s.auth.getUser(); return user; }

const LineItemSchema = z.object({ description: z.string(), qty: z.number().positive(), unit_price: z.number().min(0) });
const PatchSchema = z.object({
  status: z.enum(['draft','sent','accepted']).optional(),
  line_items: z.array(LineItemSchema).optional(),
  total: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { id } = await params;
  const { data, error } = await db().from('quotes').select('*').eq('id', id).single();
  if (error || !data) return json({ error: 'Not found' }, 404);
  return json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues.map(i => i.message).join(", ") }, 400);
  const { data, error } = await db().from('quotes').update(parsed.data).eq('id', id).select().single();
  if (error) return json({ error: error.message }, 500);
  return json(data);
}
