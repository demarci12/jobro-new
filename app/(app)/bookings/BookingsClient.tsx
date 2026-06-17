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
    setBookings(r.ok ? await r.json() : []);
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bookings</h1>
        <Link href="/bookings/new" className="btn">+ New booking</Link>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select className="input" style={{ width: 'auto' }} value={workerFilter} onChange={e => filter(e.target.value)}>
          <option value="">All workers</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">No bookings found.</div>
      ) : (
        <div className="table-wrap" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          <table className="table">
            <thead>
              <tr><th>Date & time</th><th>Client</th><th>Worker</th><th>Service</th><th>Price</th><th>Sync</th><th>Status</th></tr>
            </thead>
            <tbody>
              {bookings.map((b: any) => (
                <tr key={b.id} className="tr-link" onClick={() => router.push(`/bookings/${b.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{new Date(b.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{b.contacts?.name ?? '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{b.workers?.name ?? '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{b.service_types?.name ?? '—'}</td>
                  <td style={{ fontWeight: 600 }}>{b.price != null ? `$${parseFloat(b.price).toFixed(2)}` : '—'}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 999,
                      background: b.google_sync_status === 'synced' ? '#f0fdf4' : '#fffbeb',
                      color: b.google_sync_status === 'synced' ? '#15803d' : '#92400e',
                    }}>
                      {b.google_sync_status === 'synced' ? '✓' : '○'} {b.google_sync_status}
                    </span>
                  </td>
                  <td><span className={`badge badge-${b.status.toLowerCase().replace('_','-')}`}>{b.status.replace('_',' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
