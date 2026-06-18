'use client';
import dynamic from 'next/dynamic';

const CalendarClient = dynamic(() => import('@/components/CalendarClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 text-slate-400 text-sm animate-pulse">
      Loading calendar…
    </div>
  ),
});

export default function CalendarWrapper({ workers }: { workers: { id: string; name: string }[] }) {
  return <CalendarClient workers={workers} />;
}
