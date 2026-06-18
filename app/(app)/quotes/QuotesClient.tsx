'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuotesClient({ initialQuotes }: { initialQuotes: any[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState('');

  const quotes = filter ? initialQuotes.filter(q => q.status === filter) : initialQuotes;

  const STATUS_CLS: Record<string, string> = {
    draft:    'bg-slate-100 text-slate-500',
    sent:     'bg-blue-50 text-blue-700',
    accepted: 'bg-green-50 text-green-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Quotes</h1>
      </div>

      <div className="mb-5">
        <select
          className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
        </select>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No quotes found.</div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="flex flex-col gap-2 sm:hidden">
            {quotes.map((q: any) => {
              const date = q.bookings?.start_time
                ? new Date(q.bookings.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—';
              return (
                <div key={q.id} onClick={() => router.push(`/bookings/${q.booking_id}`)} className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900">{q.bookings?.contacts?.name ?? '—'}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_CLS[q.status] ?? STATUS_CLS.draft}`}>{q.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{date}</span>
                    <span className="font-semibold text-slate-800">{q.total != null ? `$${parseFloat(q.total).toFixed(2)}` : '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Client', 'Booking date', 'Line items', 'Total', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotes.map((q: any) => {
                  const date = q.bookings?.start_time
                    ? new Date(q.bookings.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—';
                  const items = (q.line_items ?? []).length;
                  return (
                    <tr key={q.id} onClick={() => router.push(`/bookings/${q.booking_id}`)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{q.bookings?.contacts?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{date}</td>
                      <td className="px-4 py-3 text-slate-500">{items} item{items !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{q.total != null ? `$${parseFloat(q.total).toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_CLS[q.status] ?? STATUS_CLS.draft}`}>{q.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
