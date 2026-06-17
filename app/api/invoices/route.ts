import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { LineItemSchema, json } from '@/lib/schemas';
import { z } from 'zod';
import { type NextRequest } from 'next/server';

async function requireAuth() { const s = await createClient(); const { data: { user } } = await s.auth.getUser(); return user; }

const CreateSchema = z.object({
  booking_id: z.string().min(1),
  line_items: z.array(LineItemSchema).max(100).optional().default([]),
  notes: z.string().optional(),
  due_date: z.string().optional(),
});

export async function GET(request: NextRequest) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { searchParams } = request.nextUrl;
  const db = createAdminClient();
  let q = db.from('invoices')
    .select('*, bookings(start_time, contacts(name,email))')
    .order('created_at', { ascending: false });
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

  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from('bookings')
    .select('id,contact_id,status,quotes(*)')
    .eq('id', parsed.data.booking_id)
    .single();
  if (!booking) return json({ error: 'Booking not found' }, 404);

  // Auto-populate from quote if no line items provided
  let lineItems = parsed.data.line_items;
  if (lineItems.length === 0 && booking.quotes?.length) {
    lineItems = booking.quotes[0].line_items ?? [];
  }
  const total = lineItems.reduce((s: number, li: { qty: number; unit_price: number }) => s + li.qty * li.unit_price, 0);

  const { data: invoice, error } = await supabase.from('invoices').insert({
    booking_id: parsed.data.booking_id,
    contact_id: booking.contact_id,
    line_items: lineItems,
    total,
    status: 'draft',
    notes: parsed.data.notes ?? null,
    due_date: parsed.data.due_date ?? null,
  }).select().single();

  if (error) return json({ error: error.message }, 500);
  return json(invoice, 201);
}
