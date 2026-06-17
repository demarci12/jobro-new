import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { type NextRequest, NextResponse } from 'next/server';

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

async function requireAuth() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  return user;
}

const MaterialSchema = z.object({
  description: z.string(),
  qty: z.number().min(0),
  unit_cost: z.number().min(0),
});

const DocSchema = z.object({
  work_notes: z.string().optional().default(''),
  materials: z.array(MaterialSchema).optional().default([]),
  checklist: z.record(z.boolean()).optional().default({}),
  worker_signature: z.string().optional().nullable(), // base64 PNG data URL
  customer_signature: z.string().optional().nullable(),
  before_photo_urls: z.array(z.string()).optional().default([]),
  after_photo_urls: z.array(z.string()).optional().default([]),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { id } = await params;
  const { data, error } = await createAdminClient()
    .from('booking_documentation')
    .select('*')
    .eq('booking_id', id)
    .single();
  if (error && error.code !== 'PGRST116') return json({ error: error.message }, 500);
  return json(data ?? { booking_id: id, work_notes: '', materials: [], checklist: {}, before_photo_urls: [], after_photo_urls: [] });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const parsed = DocSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues.map(i => i.message).join(', ') }, 400);

  const materials_total = parsed.data.materials.reduce((s, m) => s + m.qty * m.unit_cost, 0);

  const { data, error } = await createAdminClient()
    .from('booking_documentation')
    .upsert({
      booking_id: id,
      ...parsed.data,
      materials_total,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'booking_id' })
    .select()
    .single();

  if (error) return json({ error: error.message }, 500);
  return json(data);
}
