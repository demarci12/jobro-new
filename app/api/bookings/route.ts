import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { runBookingPipeline } from '@/lib/bookingPipeline';
import { json } from '@/lib/schemas';
import { z } from 'zod';
import { type NextRequest } from 'next/server';

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

  // Validate date params
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  if (dateFrom && isNaN(new Date(dateFrom).getTime())) return json({ error: 'Invalid date_from' }, 400);
  if (dateTo && isNaN(new Date(dateTo).getTime())) return json({ error: 'Invalid date_to' }, 400);

  const db = createAdminClient();
  let q = db
    .from('bookings')
    .select('*, contacts(name,email,phone), workers(name), service_types(name), quotes(id,status,total), invoices(id,status,total)', { count: 'exact' })
    .order('start_time', { ascending: false })
    .limit(200);
  if (searchParams.get('worker_id')) q = q.eq('worker_id', searchParams.get('worker_id')!);
  if (dateFrom) q = q.gte('start_time', new Date(dateFrom).toISOString());
  if (dateTo) q = q.lte('start_time', new Date(dateTo).toISOString());
  if (searchParams.get('status')) q = q.eq('status', searchParams.get('status')!);
  const { data, error, count } = await q;
  if (error) return json({ error: error.message }, 500);
  return json({ data, total: count ?? 0 });
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
