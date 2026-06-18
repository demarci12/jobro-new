/**
 * Staged booking pipeline — mirrors cal.diy's handleNewBooking pattern.
 *
 * Steps:
 *   1. Validate schema (done by caller with Zod)
 *   2. Load contact + worker
 *   3. Check capacity (max bookings/day per worker)
 *   4. Check scheduling conflict
 *   5. Insert booking
 *   6. Fan-out side effects (Google Calendar) — soft-fail
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { createCalendarEvent } from '@/lib/googleCalendar';
import { hasConflict, type TimeRange } from '@/lib/availability';
import { sendBookingConfirmation } from '@/lib/email';

export interface BookingInput {
  contact_id: string;
  worker_id: string;
  service_type_id?: string;
  start_time: string;
  end_time: string;
  address?: string;
  price?: number;
  notes?: string;
}

export type BookingPipelineResult =
  | { ok: true; booking: Record<string, unknown> }
  | { ok: false; status: number; error: string };

const MAX_BOOKINGS_PER_DAY = 8;

export async function runBookingPipeline(input: BookingInput): Promise<BookingPipelineResult> {
  const db = createAdminClient();
  const start = new Date(input.start_time);
  const end = new Date(input.end_time);

  // ── Step 2: Load contact + worker ──────────────────────────────────────────
  const [{ data: contact }, { data: worker }] = await Promise.all([
    db.from('contacts').select('id,name,email').eq('id', input.contact_id).single(),
    db.from('workers').select('id,name,email,google_calendar_id').eq('id', input.worker_id).single(),
  ]);
  if (!contact) return { ok: false, status: 404, error: 'Contact not found' };
  if (!worker) return { ok: false, status: 404, error: 'Worker not found' };

  // ── Step 3: Capacity check (max bookings/day) ──────────────────────────────
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);

  const { count: todayCount } = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('worker_id', input.worker_id)
    .neq('status', 'CANCELLED')
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString());

  if ((todayCount ?? 0) >= MAX_BOOKINGS_PER_DAY) {
    return { ok: false, status: 409, error: `Worker already has ${MAX_BOOKINGS_PER_DAY} bookings on this day` };
  }

  // ── Step 4: Conflict check ─────────────────────────────────────────────────
  const { data: workerBookings } = await db
    .from('bookings')
    .select('start_time,end_time')
    .eq('worker_id', input.worker_id)
    .neq('status', 'CANCELLED')
    .gte('start_time', dayStart.toISOString())
    .lte('end_time', dayEnd.toISOString());

  const busy: TimeRange[] = (workerBookings ?? []).map(b => ({
    start: new Date(b.start_time),
    end: new Date(b.end_time),
  }));

  if (hasConflict(busy, start, end)) {
    return { ok: false, status: 409, error: 'Worker has a conflicting booking in that time slot' };
  }

  // ── Step 5: Insert booking ─────────────────────────────────────────────────
  const { data: booking, error: insertError } = await db
    .from('bookings')
    .insert({
      contact_id: input.contact_id,
      worker_id: input.worker_id,
      service_type_id: input.service_type_id ?? null,
      start_time: input.start_time,
      end_time: input.end_time,
      address: input.address ?? null,
      price: input.price ?? null,
      notes: input.notes ?? null,
      status: 'SCHEDULED',
      google_sync_status: 'pending',
    })
    .select()
    .single();

  if (insertError || !booking) {
    return { ok: false, status: 500, error: insertError?.message ?? 'Insert failed' };
  }

  // ── Step 6: Confirmation email — soft-fail ────────────────────────────────
  if (contact.email) {
    const { data: serviceType } = input.service_type_id
      ? await db.from('service_types').select('name').eq('id', input.service_type_id).single()
      : { data: null };
    sendBookingConfirmation({
      clientName: contact.name,
      clientEmail: contact.email,
      workerName: worker.name,
      serviceName: serviceType?.name,
      startTime: input.start_time,
      endTime: input.end_time,
      address: input.address,
      bookingId: booking.id,
    }).catch(() => {}); // fire-and-forget, never block booking creation
  }

  // ── Step 7: Fan-out (GCal) — soft-fail ────────────────────────────────────
  try {
    const attendees = [worker.email].filter(Boolean) as string[];
    if (contact.email) attendees.push(contact.email);
    const { googleEventId, meetLink } = await createCalendarEvent({
      summary: `${contact.name} — ${worker.name}`,
      location: input.address,
      startTime: input.start_time,
      endTime: input.end_time,
      attendeeEmails: attendees,
      workerCalendarId: worker.google_calendar_id,
    });
    await db.from('bookings').update({ google_event_id: googleEventId, google_meet_link: meetLink, google_sync_status: 'synced' }).eq('id', booking.id);
    booking.google_sync_status = 'synced';
  } catch (err) {
    const syncStatus = err instanceof Error && err.message === 'GOOGLE_TOKEN_REVOKED' ? 'failed' : 'pending';
    await db.from('bookings').update({ google_sync_status: syncStatus }).eq('id', booking.id);
  }

  return { ok: true, booking };
}
