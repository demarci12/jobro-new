import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { LineItemSchema, json } from '@/lib/schemas';
import { z } from 'zod';
import { type NextRequest } from 'next/server';

async function requireAuth() { const s = await createClient(); const { data: { user } } = await s.auth.getUser(); return user; }

const PatchSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'void']).optional(),
  line_items: z.array(LineItemSchema).max(100).optional(),
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
  const { data, error } = await createAdminClient()
    .from('invoices')
    .select('*, bookings(id, start_time, address, contacts(name,email,phone), workers(name))')
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

  const supabase = createAdminClient();
  const { data: existing } = await supabase.from('invoices').select('status, booking_id').eq('id', id).single();
  if (!existing) return json({ error: 'Not found' }, 404);

  // Guard: no edits to paid/void invoices
  if (existing.status === 'paid' || existing.status === 'void') {
    if (parsed.data.line_items !== undefined || parsed.data.notes !== undefined) {
      return json({ error: 'Cannot edit a paid or void invoice' }, 422);
    }
  }

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
  if (parsed.data.status === 'paid' && existing.booking_id) {
    const { error: bookingErr } = await supabase
      .from('bookings')
      .update({ status: 'INVOICED' })
      .eq('id', existing.booking_id)
      .eq('status', 'FINISHED');
    if (bookingErr) console.warn(`Failed to mark booking ${existing.booking_id} as INVOICED:`, bookingErr.message);
  }

  return json(data);
}
