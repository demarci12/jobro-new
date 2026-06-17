import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { runBookingPipeline } from '@/lib/bookingPipeline';
import { z } from 'zod';
import { type NextRequest, NextResponse } from 'next/server';

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

const CreateSchema = z.object({
  contact_id: z.string().min(1),
  worker_id: z.string().min(1),
  service_type_id: z.string().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  address: z.string().optional(),
  price: z.number().optional(),
  notes: z.string().optional(),
}).refine(d => new Date(d.end_time) > new Date(d.start_time), {
  message: 'end_time must be after start_time',
  path: ['end_time'],
});

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: NextRequest) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { searchParams } = request.nextUrl;
  const db = createAdminClient();
  let q = db
    .from('bookings')
    .select('*, contacts(name,email,phone), workers(name), service_types(name), quotes(id,status,total), invoices(id,status,total)')
    .order('start_time', { ascending: false })
    .limit(500);
  if (searchParams.get('worker_id')) q = q.eq('worker_id', searchParams.get('worker_id')!);
  if (searchParams.get('date_from')) q = q.gte('start_time', searchParams.get('date_from')!);
  if (searchParams.get('date_to')) q = q.lte('start_time', searchParams.get('date_to')!);
  if (searchParams.get('status')) q = q.eq('status', searchParams.get('status')!);
  const { data, error } = await q;
  if (error) return json({ error: error.message }, 500);
  return json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues.map(i => i.message).join(', ') }, 400);

  const result = await runBookingPipeline(parsed.data);
  if (!result.ok) return json({ error: result.error }, result.status);
  return json(result.booking, 201);
}
