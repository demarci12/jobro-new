/**
 * Availability slots endpoint — cal.diy-inspired busyTimes → subtract → getSlots pipeline.
 *
 * GET /api/slots?worker_id=&date=YYYY-MM-DD&duration_min=60
 * Returns available start times for a worker on a given day.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { subtractBusy, getSlots, buildWorkingHours, type TimeRange } from '@/lib/availability';
import { type NextRequest, NextResponse } from 'next/server';

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

// Default schedule: Mon–Fri 08:00–18:00, Sat 09:00–13:00
const DEFAULT_SCHEDULE: Partial<Record<number, { start: string; end: string }>> = {
  1: { start: '08:00', end: '18:00' },
  2: { start: '08:00', end: '18:00' },
  3: { start: '08:00', end: '18:00' },
  4: { start: '08:00', end: '18:00' },
  5: { start: '08:00', end: '18:00' },
  6: { start: '09:00', end: '13:00' },
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { searchParams } = request.nextUrl;
  const workerId = searchParams.get('worker_id');
  const dateStr = searchParams.get('date'); // YYYY-MM-DD
  const durationMin = parseInt(searchParams.get('duration_min') ?? '60');

  if (!workerId || !dateStr) return json({ error: 'worker_id and date are required' }, 400);
  if (isNaN(durationMin) || durationMin < 15) return json({ error: 'duration_min must be >= 15' }, 400);

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  // Fetch existing bookings as busy times
  const db = createAdminClient();
  const { data: bookings, error } = await db
    .from('bookings')
    .select('start_time,end_time')
    .eq('worker_id', workerId)
    .neq('status', 'CANCELLED')
    .gte('start_time', dayStart.toISOString())
    .lte('end_time', dayEnd.toISOString());

  if (error) return json({ error: error.message }, 500);

  const busy: TimeRange[] = (bookings ?? []).map(b => ({
    start: new Date(b.start_time),
    end: new Date(b.end_time),
  }));

  const workingHours = buildWorkingHours(dayStart, dayEnd, DEFAULT_SCHEDULE);
  const freeWindows = subtractBusy(workingHours, busy);
  const slots = getSlots({ freeWindows, slotDurationMin: durationMin, bufferMin: 15 });

  return json({ date: dateStr, worker_id: workerId, duration_min: durationMin, slots: slots.map(s => s.toISOString()) });
}
