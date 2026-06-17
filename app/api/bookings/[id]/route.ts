import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { updateCalendarEvent, cancelCalendarEvent } from '@/lib/googleCalendar';
import { hasConflict, type TimeRange } from '@/lib/availability';
import { json } from '@/lib/schemas';
import { z } from 'zod';
import { type NextRequest } from 'next/server';

const PatchSchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'INVOICED', 'CANCELLED']).optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  address: z.string().optional(),
  price: z.number().optional(),
  service_type_id: z.string().optional(),
  notes: z.string().optional(),
}).refine(d => {
  if (d.start_time && d.end_time) return new Date(d.end_time) > new Date(d.start_time);
  return true;
}, { message: 'end_time must be after start_time', path: ['end_time'] });

const TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['FINISHED', 'CANCELLED'],
  FINISHED: ['INVOICED', 'CANCELLED'],
  INVOICED: ['CANCELLED'],
  CANCELLED: [],
};

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return json({ error: 'Unauthorized' }, 401);
  const { id } = await params;
  const { data, error } = await createAdminClient()
    .from('bookings')
    .select('*, contacts(name,email,phone), workers(name,email,google_calendar_id), service_types(name), quotes(*), invoices(*)')
    .eq('id', id)
    .single();
  if (error || !data) return json({ error: 'Booking not found' }, 404);
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
  const { data: existing, error: fe } = await supabase
    .from('bookings')
    .select('*, workers(name,email,google_calendar_id), contacts(name,email)')
    .eq('id', id)
    .single();
  if (fe || !existing) return json({ error: 'Booking not found' }, 404);

  if (parsed.data.status && parsed.data.status !== existing.status) {
    const allowed = TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return json({ error: `Cannot transition from ${existing.status} to ${parsed.data.status}` }, 422);
    }
  }

  // Guard: don't allow editing paid/invoiced bookings' time slots
  if (existing.status === 'INVOICED' && (parsed.data.start_time || parsed.data.end_time)) {
    return json({ error: 'Cannot reschedule an invoiced booking' }, 422);
  }

  const patch = parsed.data;
  const newStart = patch.start_time ?? existing.start_time;
  const newEnd = patch.end_time ?? existing.end_time;
  const isReschedule = !!(patch.start_time || patch.end_time);

  if (isReschedule) {
    const dayStart = new Date(newStart); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(newStart); dayEnd.setHours(23, 59, 59, 999);
    const { data: sameDay } = await supabase
      .from('bookings')
      .select('start_time,end_time')
      .eq('worker_id', existing.worker_id)
      .neq('id', id)
      .neq('status', 'CANCELLED')
      .gte('start_time', dayStart.toISOString())
      .lte('end_time', dayEnd.toISOString());
    const busy: TimeRange[] = (sameDay ?? []).map((c: { start_time: string; end_time: string }) => ({ start: new Date(c.start_time), end: new Date(c.end_time) }));
    if (hasConflict(busy, new Date(newStart), new Date(newEnd))) {
      return json({ error: 'Worker has a conflicting booking in that time slot' }, 409);
    }
  }

  const { data: updated, error: ue } = await supabase
    .from('bookings')
    .update({ ...patch, google_sync_status: 'pending' })
    .eq('id', id)
    .select()
    .single();
  if (ue) return json({ error: ue.message }, 500);

  if (existing.google_event_id && existing.workers?.google_calendar_id) {
    try {
      if (patch.status === 'CANCELLED') {
        await cancelCalendarEvent(existing.google_event_id, existing.workers.google_calendar_id);
      } else if (isReschedule || patch.address) {
        await updateCalendarEvent(existing.google_event_id, existing.workers.google_calendar_id, {
          startTime: newStart, endTime: newEnd, location: patch.address ?? existing.address,
        });
      }
      await supabase.from('bookings').update({ google_sync_status: 'synced' }).eq('id', id);
    } catch (err) {
      console.error(`GCal sync error for booking ${id}:`, err);
      await supabase.from('bookings').update({ google_sync_status: 'failed' }).eq('id', id);
    }
  }

  return json(updated);
}
