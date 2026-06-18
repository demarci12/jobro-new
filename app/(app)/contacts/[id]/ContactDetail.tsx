'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ContactDetail({ contact, bookings, total }: { contact: any; bookings: any[]; total: number }) {
  const router = useRouter();
  const qMap: Record<string, [string, string]> = {
    draft: ['#f5f5f5', '#737373'], sent: ['#eff6ff', '#1d4ed8'], accepted: ['#f0fdf4', '#15803d'],
  };

  const BOOKING_STATUS: Record<string, string> = {
    SCHEDULED: 'bg-blue-50 text-blue-700', IN_PROGRESS: 'bg-orange-50 text-orange-700',
    FINISHED: 'bg-green-50 text-green-700', CANCELLED: 'bg-slate-100 text-slate-500', INVOICED: 'bg-purple-50 text-purple-700',
  };
  const QUOTE_STATUS: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-500', sent: 'bg-blue-50 text-blue-700', accepted: 'bg-green-50 text-green-700',
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/contacts" className="text-sm text-slate-500 hover:text-slate-700 no-underline mb-2 inline-block">← Clients</Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{contact.name}</h1>
        </div>
        <Link href={`/bookings/new?contact_id=${contact.id}`} className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center">+ New booking</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Contact details</h2>
          <div className="flex flex-col gap-2.5">
            {contact.email && <Row label="Email"><a href={`mailto:${contact.email}`} className="text-blue-600 no-underline hover:underline">{contact.email}</a></Row>}
            {contact.phone && <Row label="Phone"><a href={`tel:${contact.phone}`} className="text-blue-600 no-underline hover:underline">{contact.phone}</a></Row>}
            {contact.address && <Row label="Address"><span>{contact.address}</span></Row>}
            {!contact.email && !contact.phone && !contact.address && <span className="text-sm text-slate-400">No details on file</span>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-center">
          <div className="text-4xl font-extrabold tracking-tight text-slate-900">{total}</div>
          <div className="text-xs text-slate-400 mt-1">Total bookings</div>
        </div>
      </div>

      <h2 className="text-sm font-bold text-slate-900 mb-3">Booking history</h2>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {['Date & time', 'Worker', 'Service', 'Quote', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-slate-400 py-10 text-sm">No bookings yet</td></tr>
            ) : bookings.map((b: any) => {
              const q = b.quotes?.[0];
              return (
                <tr key={b.id} onClick={() => router.push(`/bookings/${b.id}`)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{new Date(b.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div className="text-xs text-slate-400">{new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{b.workers?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{b.service_types?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {q ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${QUOTE_STATUS[q.status] ?? QUOTE_STATUS.draft}`}>{q.status}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${BOOKING_STATUS[b.status] ?? 'bg-slate-100 text-slate-500'}`}>{b.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm items-baseline">
      <span className="text-xs text-slate-400 w-14 shrink-0">{label}</span>
      {children}
    </div>
  );
}
