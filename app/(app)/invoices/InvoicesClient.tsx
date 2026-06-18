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

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Invoices</h1>
      </div>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => applyFilter(s)}
            className={`h-8 px-3 rounded-lg border text-xs font-semibold capitalize transition-colors ${
              filter === s
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >{s}</button>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No invoices found.</div>
      ) : (
        <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          {/* Mobile card list */}
          <div className="flex flex-col gap-2 sm:hidden">
            {invoices.map((inv: any) => (
              <div key={inv.id} onClick={() => router.push(`/invoices/${inv.id}`)} className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">{inv.bookings?.contacts?.name ?? '—'}</span>
                  <span className="text-sm font-bold text-slate-900">${parseFloat(inv.total ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {inv.bookings?.start_time ? new Date(inv.bookings.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                  <InvoiceBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Client', 'Booking date', 'Total', 'Status', 'Created'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} onClick={() => router.push(`/invoices/${inv.id}`)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{inv.bookings?.contacts?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {inv.bookings?.start_time ? new Date(inv.bookings.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">${parseFloat(inv.total ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3"><InvoiceBadge status={inv.status} /></td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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

export function InvoiceBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-500',
    sent:  'bg-blue-50 text-blue-700',
    paid:  'bg-green-50 text-green-700',
    void:  'bg-red-50 text-red-600',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cls[status] ?? cls.draft}`}>
      {status}
    </span>
  );
}
