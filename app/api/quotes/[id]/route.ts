import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { LineItemSchema, json } from '@/lib/schemas';
import { z } from 'zod';
import { type NextRequest } from 'next/server';

async function requireAuth() { const s = await createClient(); const { data: { user } } = await s.auth.getUser(); return user; }

const PatchSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted']).optional(),
  line_items: z.array(LineItemSchema).max(100).optional(),
  total: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { id } = await params;
  const { data, error } = await createAdminClient().from('quotes').select('*').eq('id', id).single();
  if (error || !data) return json({ error: 'Not found' }, 404);
  return json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues.map(i => i.message).join(', ') }, 400);
  const { data, error } = await createAdminClient().from('quotes').update(parsed.data).eq('id', id).select().single();
  if (error) return json({ error: error.message }, 500);
  return json(data);
}
