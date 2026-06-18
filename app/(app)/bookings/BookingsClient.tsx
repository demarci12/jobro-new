'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BookingsClient({ initialBookings, workers }: { initialBookings: any[]; workers: any[] }) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [workerFilter, setWorkerFilter] = useState('');
  const [loading, setLoading] = useState(false);

  async function filter(wf: string) {
    setWorkerFilter(wf);
    setLoading(true);
    const params = new URLSearchParams();
    if (wf) params.set('worker_id', wf);
    const r = await fetch(`/api/bookings?${params}`);
    const json = r.ok ? await r.json() : {};
    setBookings(json.data ?? []);
    setLoading(false);
  }

  const STATUS_CLS: Record<string, string> = {
    SCHEDULED: 'bg-blue-50 text-blue-700',
    IN_PROGRESS: 'bg-orange-50 text-orange-700',
    FINISHED: 'bg-green-50 text-green-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
    INVOICED: 'bg-purple-50 text-purple-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Bookings</h1>
        <Link href="/bookings/new" className="h-9 px-3 sm:px-4 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center">+ New</Link>
      </div>

      <div className="mb-4">
        <select
          className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={workerFilter}
          onChange={e => filter(e.target.value)}
        >
          <option value="">All workers</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No bookings found.</div>
      ) : (
        <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          {/* Mobile card list */}
          <div className="flex flex-col gap-2 sm:hidden">
            {bookings.map((b: any) => (
              <div key={b.id} onClick={() => router.push(`/bookings/${b.id}`)} className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-slate-900">{b.contacts?.name ?? '—'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{b.workers?.name ?? '—'} · {b.service_types?.name ?? '—'}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ml-2 ${STATUS_CLS[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {b.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(b.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  {b.price != null && <span className="font-semibold text-slate-800">${parseFloat(b.price).toFixed(2)}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Date & time', 'Client', 'Worker', 'Service', 'Price', 'Sync', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: any) => (
                  <tr key={b.id} onClick={() => router.push(`/bookings/${b.id}`)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{new Date(b.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div className="text-xs text-slate-400">{new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{b.contacts?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{b.workers?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{b.service_types?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{b.price != null ? `$${parseFloat(b.price).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${b.google_sync_status === 'synced' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {b.google_sync_status === 'synced' ? '✓' : '○'} {b.google_sync_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_CLS[b.status] ?? 'bg-slate-100 text-slate-500'}`}>{b.status.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
