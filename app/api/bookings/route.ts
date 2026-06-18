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
  // Recurring fields
  recurrence: z.enum(['none', 'weekly', 'fortnightly', 'monthly']).optional().default('none'),
  recurrence_count: z.number().int().min(1).max(52).optional().default(1),
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

  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  if (dateFrom && isNaN(new Date(dateFrom).getTime())) return json({ error: 'Invalid date_from' }, 400);
  if (dateTo && isNaN(new Date(dateTo).getTime())) return json({ error: 'Invalid date_to' }, 400);

  const db = createAdminClient();
  // slim=1: calendar view — skip quotes/invoices joins for faster response
  const slim = searchParams.get('slim') === '1';
  const selectFields = slim
    ? '*, contacts(name), workers(name), service_types(name)'
    : '*, contacts(name,email,phone), workers(name), service_types(name), quotes(id,status,total), invoices(id,status,total)';
  let q = db
    .from('bookings')
    .select(selectFields, { count: 'exact' })
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

function addInterval(date: Date, recurrence: string): Date {
  const d = new Date(date);
  if (recurrence === 'weekly')      d.setDate(d.getDate() + 7);
  if (recurrence === 'fortnightly') d.setDate(d.getDate() + 14);
  if (recurrence === 'monthly')     d.setMonth(d.getMonth() + 1);
  return d;
}

export async function POST(request: NextRequest) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues.map(i => i.message).join(', ') }, 400);

  const { recurrence, recurrence_count, ...baseInput } = parsed.data;

  // Single booking
  if (!recurrence || recurrence === 'none' || recurrence_count <= 1) {
    const result = await runBookingPipeline(baseInput);
    if (!result.ok) return json({ error: result.error }, result.status);
    return json(result.booking, 201);
  }

  // Recurring — generate all occurrences
  const recurrenceGroupId = crypto.randomUUID();
  const bookings = [];
  const errors = [];

  let start = new Date(baseInput.start_time);
  let end   = new Date(baseInput.end_time);
  const durationMs = end.getTime() - start.getTime();

  for (let i = 0; i < recurrence_count; i++) {
    const result = await runBookingPipeline({
      ...baseInput,
      start_time: start.toISOString(),
      end_time:   new Date(start.getTime() + durationMs).toISOString(),
      notes: baseInput.notes ? `${baseInput.notes} (${i + 1}/${recurrence_count})` : `Recurring ${i + 1}/${recurrence_count}`,
    });

    if (result.ok) {
      // Tag with recurrence group
      bookings.push(result.booking);
      const db = createAdminClient();
      await db.from('bookings').update({ recurrence_group_id: recurrenceGroupId, recurrence_index: i }).eq('id', (result.booking as any).id);
    } else {
      errors.push(`Occurrence ${i + 1}: ${result.error}`);
    }

    start = addInterval(start, recurrence);
  }

  return json({ bookings, errors, recurrence_group_id: recurrenceGroupId, created: bookings.length }, 201);
}
