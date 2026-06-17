/**
 * Availability & slots engine — ported from cal.diy's busyTimes → subtract → getSlots pattern.
 *
 * Usage:
 *   const busy = await getWorkerBusyTimes(workerId, from, to)
 *   const slots = getAvailableSlots({ busyTimes: busy, workingHours, slotDuration, from, to })
 */

export interface TimeRange {
  start: Date;
  end: Date;
}

/** Subtract busy ranges from working-hour windows. Returns free intervals. */
export function subtractBusy(working: TimeRange[], busy: TimeRange[]): TimeRange[] {
  const sorted = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());
  let free: TimeRange[] = [...working];

  for (const b of sorted) {
    const next: TimeRange[] = [];
    for (const w of free) {
      if (b.end <= w.start || b.start >= w.end) {
        next.push(w); // no overlap
      } else {
        if (b.start > w.start) next.push({ start: w.start, end: b.start });
        if (b.end < w.end) next.push({ start: b.end, end: w.end });
      }
    }
    free = next;
  }
  return free;
}

export interface SlotOptions {
  freeWindows: TimeRange[];
  slotDurationMin: number;
  bufferMin?: number; // gap between slots
}

/** Chop free windows into fixed-size slots. */
export function getSlots({ freeWindows, slotDurationMin, bufferMin = 0 }: SlotOptions): Date[] {
  const slots: Date[] = [];
  const step = (slotDurationMin + bufferMin) * 60_000;
  const dur = slotDurationMin * 60_000;

  for (const w of freeWindows) {
    let cursor = w.start.getTime();
    while (cursor + dur <= w.end.getTime()) {
      slots.push(new Date(cursor));
      cursor += step;
    }
  }
  return slots;
}

/** Check if a proposed [start, end) overlaps any busy range. */
export function hasConflict(busy: TimeRange[], start: Date, end: Date): boolean {
  for (const b of busy) {
    // overlap if start < b.end AND end > b.start
    if (start < b.end && end > b.start) return true;
  }
  return false;
}

/**
 * Build working-hour windows for a date range from a simple weekly schedule.
 * schedule: { [0..6]: { start: "08:00", end: "17:00" } | null }
 */
export interface DaySchedule {
  start: string; // "HH:MM"
  end: string;
}

export function buildWorkingHours(
  from: Date,
  to: Date,
  schedule: Partial<Record<number, DaySchedule>>,
  tzOffset = 0, // minutes offset from UTC
): TimeRange[] {
  const windows: TimeRange[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= to) {
    const dow = cursor.getUTCDay();
    const day = schedule[dow];
    if (day) {
      const [sh, sm] = day.start.split(':').map(Number);
      const [eh, em] = day.end.split(':').map(Number);
      const base = cursor.getTime() - tzOffset * 60_000;
      windows.push({
        start: new Date(base + (sh * 60 + sm) * 60_000),
        end: new Date(base + (eh * 60 + em) * 60_000),
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return windows;
}
