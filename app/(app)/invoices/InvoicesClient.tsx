'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_FILTERS = ['all', 'draft', 'sent', 'paid', 'void'];

export default function InvoicesClient({ initialInvoices }: { initialInvoices: any[] }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  async function applyFilter(status: string) {
    setFilter(status);
    setLoading(true);
    const params = status !== 'all' ? `?status=${status}` : '';
    const r = await fetch(`/api/invoices${params}`);
    setInvoices(r.ok ? await r.json() : []);
    setLoading(false);
  }

  const visible = invoices;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Invoices</h1>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => applyFilter(s)} className="btn ghost small" style={{
            background: filter === s ? 'var(--blue-light)' : undefined,
            color: filter === s ? 'var(--blue)' : undefined,
            borderColor: filter === s ? 'var(--blue)' : undefined,
            textTransform: 'capitalize',
          }}>{s}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">No invoices found.</div>
      ) : (
        <div className="table-wrap" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          <table className="table">
            <thead>
              <tr><th>Client</th><th>Booking date</th><th>Total</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {visible.map((inv: any) => (
                <tr key={inv.id} className="tr-link" onClick={() => router.push(`/invoices/${inv.id}`)}>
                  <td style={{ fontWeight: 500 }}>{inv.bookings?.contacts?.name ?? '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {inv.bookings?.start_time
                      ? new Date(inv.bookings.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td style={{ fontWeight: 700 }}>${parseFloat(inv.total ?? 0).toFixed(2)}</td>
                  <td><InvoiceBadge status={inv.status} /></td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function InvoiceBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    draft: ['#f5f5f5', '#737373'],
    sent:  ['#eff6ff', '#1d4ed8'],
    paid:  ['#f0fdf4', '#15803d'],
    void:  ['#fef2f2', '#dc2626'],
  };
  const [bg, color] = map[status] ?? map.draft;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: bg, color, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}
