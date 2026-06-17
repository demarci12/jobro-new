'use client';
import dynamic from 'next/dynamic';

const CalendarClient = dynamic(() => import('@/components/CalendarClient'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--muted)', fontSize: 14 }}>
      Loading calendar…
    </div>
  ),
});

export default function CalendarPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <CalendarClient />
    </div>
  );
}
