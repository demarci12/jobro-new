'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg, EventDropArg, EventInput } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  SCHEDULED:   { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  IN_PROGRESS: { bg: '#ffedd5', border: '#f97316', text: '#7c2d12' },
  FINISHED:    { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  INVOICED:    { bg: '#f3e8ff', border: '#9333ea', text: '#581c87' },
  CANCELLED:   { bg: '#f5f5f5', border: '#d4d4d4', text: '#a3a3a3' },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED:   ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['FINISHED', 'CANCELLED'],
  FINISHED:    ['INVOICED', 'CANCELLED'],
  INVOICED:    ['CANCELLED'],
  CANCELLED:   [],
};

interface Popover {
  eventId: string;
  title: string;
  worker: string;
  service: string;
  status: string;
  start: string;
  end: string;
  x: number;
  y: number;
}

function mapToEvent(b: any): EventInput {
  const c = STATUS_COLORS[b.status] ?? STATUS_COLORS.SCHEDULED;
  return {
    id: b.id,
    title: b.contacts?.name ?? 'Unknown',
    start: b.start_time,
    end: b.end_time,
    backgroundColor: c.bg,
    borderColor: c.border,
    textColor: c.text,
    extendedProps: { worker: b.workers?.name ?? '', service: b.service_types?.name ?? '', status: b.status },
    editable: b.status !== 'INVOICED' && b.status !== 'CANCELLED',
  };
}

export default function CalendarClient({ workers }: { workers: { id: string; name: string }[] }) {
  const router = useRouter();
  const calRef = useRef<FullCalendar>(null);
  // Use a ref for the filter so the event source callback stays stable
  const workerFilterRef = useRef('');
  const [workerFilter, setWorkerFilter] = useState('');
  const [popover, setPopover] = useState<Popover | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Close popover on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = document.getElementById('cal-popover');
      if (el && !el.contains(e.target as Node)) setPopover(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // Stable event source function — FullCalendar calls this when it needs a date range.
  // Uses workerFilterRef so changing the filter doesn't recreate the function.
  const fetchEvents = useCallback((
    info: { startStr: string; endStr: string },
    success: (events: EventInput[]) => void,
    failure: (err: Error) => void,
  ) => {
    const params = new URLSearchParams({
      date_from: info.startStr,
      date_to: info.endStr,
      slim: '1',
    });
    if (workerFilterRef.current) params.set('worker_id', workerFilterRef.current);
    fetch(`/api/bookings?${params}`)
      .then(r => r.json())
      .then(({ data }) => success((data ?? []).map(mapToEvent)))
      .catch(() => failure(new Error('Failed to load bookings')));
  }, []);

  function handleWorkerChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const wf = e.target.value;
    workerFilterRef.current = wf;
    setWorkerFilter(wf);
    calRef.current?.getApi().refetchEvents();
  }

  function handleEventClick(info: EventClickArg) {
    const rect = info.el.getBoundingClientRect();
    const ep = info.event.extendedProps;
    setPopover({
      eventId: info.event.id,
      title: info.event.title,
      worker: ep.worker,
      service: ep.service,
      status: ep.status,
      start: info.event.start ? info.event.start.toISOString() : '',
      end: info.event.end ? info.event.end.toISOString() : '',
      x: Math.min(rect.right + 8, window.innerWidth - 280),
      y: Math.min(rect.top, window.innerHeight - 320),
    });
  }

  function handleDateSelect(info: DateSelectArg) {
    router.push(`/bookings/new?start=${encodeURIComponent(info.startStr.slice(0, 16))}`);
  }

  async function handleEventDrop(info: EventDropArg) {
    const { event, revert } = info;
    const start = event.start?.toISOString();
    const end = event.end?.toISOString();
    if (!start || !end) { revert(); return; }
    const r = await fetch(`/api/bookings/${event.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: start, end_time: end }),
    });
    if (!r.ok) { const d = await r.json(); revert(); showToast(d.error ?? 'Could not reschedule', false); }
    else {
      showToast('Booking rescheduled');
      if (popover?.eventId === event.id) setPopover(p => p ? { ...p, start, end } : null);
    }
  }

  async function handleEventResize(info: EventResizeDoneArg) {
    const { event, revert } = info;
    const start = event.start?.toISOString();
    const end = event.end?.toISOString();
    if (!start || !end) { revert(); return; }
    const r = await fetch(`/api/bookings/${event.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: start, end_time: end }),
    });
    if (!r.ok) { const d = await r.json(); revert(); showToast(d.error ?? 'Could not resize booking', false); }
    else showToast('Booking updated');
  }

  async function changeStatus(newStatus: string) {
    if (!popover) return;
    setStatusChanging(true);
    const r = await fetch(`/api/bookings/${popover.eventId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatusChanging(false);
    if (!r.ok) { const d = await r.json(); showToast(d.error ?? 'Status update failed', false); return; }
    showToast(`Status → ${newStatus.replace('_', ' ')}`);
    setPopover(p => p ? { ...p, status: newStatus } : null);
    calRef.current?.getApi().refetchEvents();
  }

  const transitions = popover ? STATUS_TRANSITIONS[popover.status] ?? [] : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Calendar</h1>
        <div className="flex gap-2 items-center">
          <select
            className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            value={workerFilter}
            onChange={handleWorkerChange}
          >
            <option value="">All workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <Link href="/bookings/new" className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center">
            + New booking
          </Link>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-2">
        Drag events to reschedule · Resize to adjust duration · Click a slot to create · Click an event for details
      </p>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <FullCalendar
          ref={calRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          height="100%"
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          nowIndicator={true}
          selectable={true}
          selectMirror={true}
          editable={true}
          eventDurationEditable={true}
          eventStartEditable={true}
          dragScroll={true}
          snapDuration="00:15:00"
          lazyFetching={true}
          events={fetchEvents}
          eventClick={handleEventClick}
          select={handleDateSelect}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventContent={renderEvent}
          firstDay={1}
          scrollTime="08:00:00"
          eventConstraint={{ startTime: '06:00', endTime: '23:00' }}
        />
      </div>

      {/* Event popover */}
      {popover && (
        <div
          id="cal-popover"
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-64 p-4"
          style={{ left: popover.x, top: popover.y }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">{popover.title}</div>
              {popover.service && <div className="text-xs text-slate-400 mt-0.5">{popover.service}</div>}
            </div>
            <button onClick={() => setPopover(null)} className="text-slate-300 hover:text-slate-500 ml-2 text-lg leading-none">×</button>
          </div>

          <div className="flex flex-col gap-1.5 text-xs text-slate-500 mb-3">
            <div className="flex gap-2">
              <span className="text-slate-300">🕐</span>
              <span>
                {popover.start ? new Date(popover.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                {' – '}
                {popover.end ? new Date(popover.end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
            {popover.worker && (
              <div className="flex gap-2">
                <span className="text-slate-300">👤</span>
                <span>{popover.worker}</span>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <span className="text-slate-300">●</span>
              <StatusBadge status={popover.status} />
            </div>
          </div>

          {transitions.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Change status</div>
              <div className="flex flex-wrap gap-1">
                {transitions.map(s => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    disabled={statusChanging}
                    className="h-6 px-2 rounded text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors capitalize"
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Link
            href={`/bookings/${popover.eventId}`}
            className="flex items-center justify-center h-8 w-full rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors no-underline"
            onClick={() => setPopover(null)}
          >
            Open booking →
          </Link>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition-all ${toast.ok ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    SCHEDULED: 'bg-blue-50 text-blue-700',
    IN_PROGRESS: 'bg-orange-50 text-orange-700',
    FINISHED: 'bg-green-50 text-green-700',
    INVOICED: 'bg-purple-50 text-purple-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full capitalize ${cls[status] ?? cls.SCHEDULED}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function renderEvent(info: any) {
  const { worker, service } = info.event.extendedProps;
  const start = info.event.start ? new Date(info.event.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  const end   = info.event.end   ? new Date(info.event.end).toLocaleTimeString('en-GB',   { hour: '2-digit', minute: '2-digit' }) : '';
  const durationMs = info.event.end && info.event.start ? info.event.end.getTime() - info.event.start.getTime() : 0;
  const tall = durationMs > 45 * 60 * 1000;
  const veryTall = durationMs > 90 * 60 * 1000;
  return (
    <div style={{ overflow: 'hidden', lineHeight: 1.3, padding: '1px 2px' }}>
      <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {info.event.title}
      </div>
      {tall && <div style={{ fontSize: 10, opacity: 0.75, marginTop: 1 }}>{start} – {end}</div>}
      {veryTall && service && <div style={{ fontSize: 10, opacity: 0.65, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service}</div>}
      {veryTall && worker && <div style={{ fontSize: 10, opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>👤 {worker}</div>}
    </div>
  );
}
