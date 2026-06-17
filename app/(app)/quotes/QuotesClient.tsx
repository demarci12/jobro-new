'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const Q_MAP: Record<string, [string, string]> = {
  draft:    ['#f5f5f5', '#737373'],
  sent:     ['#eff6ff', '#1d4ed8'],
  accepted: ['#f0fdf4', '#15803d'],
};

export default function QuotesClient({ initialQuotes }: { initialQuotes: any[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState('');

  const quotes = filter ? initialQuotes.filter(q => q.status === filter) : initialQuotes;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Quotes</h1>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select className="input" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
        </select>
      </div>

      {quotes.length === 0 ? (
        <div className="empty-state">No quotes found.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Client</th><th>Booking date</th><th>Line items</th><th>Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              {quotes.map((q: any) => {
                const date = q.bookings?.start_time
                  ? new Date(q.bookings.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—';
                const items = (q.line_items ?? []).length;
                const [bg, color] = Q_MAP[q.status] ?? Q_MAP.draft;
                return (
                  <tr key={q.id} className="tr-link" onClick={() => router.push(`/bookings/${q.booking_id}`)}>
                    <td style={{ fontWeight: 500 }}>{q.bookings?.contacts?.name ?? '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{date}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{items} item{items !== 1 ? 's' : ''}</td>
                    <td style={{ fontWeight: 700 }}>{q.total != null ? `$${parseFloat(q.total).toFixed(2)}` : '—'}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: bg, color, textTransform: 'capitalize' }}>
                        {q.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
