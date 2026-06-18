'use client';
import dynamic from 'next/dynamic';

const CalendarClient = dynamic(() => import('@/components/CalendarClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 text-slate-400 text-sm">
      Loading calendar…
    </div>
  ),
});

export default function CalendarPage() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      <CalendarClient />
    </div>
  );
}
