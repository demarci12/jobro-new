'use client';
import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg, EventInput } from '@fullcalendar/core';
import { useRouter } from 'next/navigation';

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  SCHEDULED:   { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  IN_PROGRESS: { bg: '#ffedd5', border: '#f97316', text: '#7c2d12' },
  FINISHED:    { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  CANCELLED:   { bg: '#f5f5f5', border: '#d4d4d4', text: '#a3a3a3' },
};

export default function CalendarClient() {
  const router = useRouter();
  const calRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const [workerFilter, setWorkerFilter] = useState('');

  useEffect(() => {
    fetch('/api/workers').then(r => r.json()).then(setWorkers).catch(() => {});
  }, []);

  async function loadEvents(from: Date, to: Date, wf = workerFilter) {
    const params = new URLSearchParams({ date_from: from.toISOString(), date_to: to.toISOString() });
    if (wf) params.set('worker_id', wf);
    const r = await fetch(`/api/bookings?${params}`);
    if (!r.ok) return;
    const { data: bookings } = await r.json();
    setEvents((bookings ?? []).map((b: any) => {
      const c = STATUS_COLORS[b.status] ?? STATUS_COLORS.SCHEDULED;
      return {
        id: b.id,
        title: b.contacts?.name ?? 'Unknown',
        start: b.start_time,
        end: b.end_time,
        backgroundColor: c.bg,
        borderColor: c.border,
        textColor: c.text,
        extendedProps: { worker: b.workers?.name, service: b.service_types?.name, status: b.status },
      };
    }));
  }

  function handleEventClick(info: EventClickArg) {
    router.push(`/bookings/${info.event.id}`);
  }

  function handleDateSelect(info: DateSelectArg) {
    router.push(`/bookings/new?start=${encodeURIComponent(info.startStr.slice(0, 16))}`);
  }

  function handleWorkerChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const wf = e.target.value;
    setWorkerFilter(wf);
    const api = calRef.current?.getApi();
    if (api) {
      const view = api.view;
      loadEvents(view.activeStart, view.activeEnd, wf);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="page-title">Calendar</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="input"
            style={{ width: 'auto', height: 34, padding: '0 10px', fontSize: 13 }}
            value={workerFilter}
            onChange={handleWorkerChange}
          >
            <option value="">All workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <a href="/bookings/new" className="btn" style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
            + New booking
          </a>
        </div>
      </div>

      <div style={{ flex: 1, background: 'var(--paper)', borderRadius: 10, border: '1px solid var(--line)', overflow: 'hidden' }}>
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
          events={events}
          datesSet={({ start, end }) => loadEvents(start, end)}
          eventClick={handleEventClick}
          select={handleDateSelect}
          eventContent={renderEvent}
          firstDay={1}
          scrollTime="08:00:00"
        />
      </div>
    </div>
  );
}

function renderEvent(info: any) {
  const { worker } = info.event.extendedProps;
  const start = info.event.start ? new Date(info.event.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  const end   = info.event.end   ? new Date(info.event.end).toLocaleTimeString('en-GB',   { hour: '2-digit', minute: '2-digit' }) : '';
  const tall  = info.event.end && info.event.start && (info.event.end.getTime() - info.event.start.getTime()) > 45 * 60 * 1000;
  return (
    <div style={{ overflow: 'hidden', lineHeight: 1.3 }}>
      <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {info.event.title}
      </div>
      {tall && <div style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>{start} – {end}</div>}
      {tall && worker && <div style={{ fontSize: 10, opacity: 0.65, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{worker}</div>}
    </div>
  );
}
