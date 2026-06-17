import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { type NextRequest, NextResponse } from 'next/server';

const db = () => createAdminClient();
const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
async function requireAuth() { const s = await createClient(); const { data: { user } } = await s.auth.getUser(); return user; }

const LineItemSchema = z.object({
  description: z.string(),
  qty: z.number().positive(),
  unit_price: z.number().min(0),
});

const PatchSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'void']).optional(),
  line_items: z.array(LineItemSchema).optional(),
  notes: z.string().optional(),
  due_date: z.string().optional(),
});

const INVOICE_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'void'],
  sent: ['paid', 'void'],
  paid: [],
  void: [],
};

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { id } = await params;
  const { data, error } = await db()
    .from('invoices')
    .select('*, bookings(start_time, address, contacts(name,email,phone), workers(name))')
    .eq('id', id)
    .single();
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

  const supabase = db();
  const { data: existing } = await supabase.from('invoices').select('status').eq('id', id).single();
  if (!existing) return json({ error: 'Not found' }, 404);

  if (parsed.data.status && parsed.data.status !== existing.status) {
    const allowed = INVOICE_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return json({ error: `Cannot transition invoice from ${existing.status} to ${parsed.data.status}` }, 422);
    }
  }

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.line_items) {
    update.total = parsed.data.line_items.reduce((s, li) => s + li.qty * li.unit_price, 0);
  }
  if (parsed.data.status === 'sent') update.sent_at = new Date().toISOString();
  if (parsed.data.status === 'paid') update.paid_at = new Date().toISOString();

  const { data, error } = await supabase.from('invoices').update(update).eq('id', id).select().single();
  if (error) return json({ error: error.message }, 500);

  // When invoice is paid, mark booking as INVOICED
  if (parsed.data.status === 'paid') {
    const { data: inv } = await supabase.from('invoices').select('booking_id').eq('id', id).single();
    if (inv?.booking_id) {
      await supabase.from('bookings').update({ status: 'INVOICED' }).eq('id', inv.booking_id).eq('status', 'FINISHED');
    }
  }

  return json(data);
}
