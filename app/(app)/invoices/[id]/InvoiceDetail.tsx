'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { InvoiceBadge } from '../InvoicesClient';

export default function InvoiceDetail({ invoice: initial }: { invoice: any }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initial);
  const [lineItems, setLineItems] = useState<any[]>(initial.line_items ?? []);
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  async function openStripeCheckout() {
    setStripeLoading(true);
    try {
      const r = await fetch('/api/stripe/checkout-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoice.id }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } finally {
      setStripeLoading(false);
    }
  }

  async function reload() {
    const r = await fetch(`/api/invoices/${invoice.id}`);
    if (r.ok) { const d = await r.json(); setInvoice(d); setLineItems(d.line_items ?? []); setNotes(d.notes ?? ''); }
  }

  async function patch(updates: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/invoices/${invoice.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    setSaving(false);
    reload();
  }

  const total = lineItems.reduce((s: number, li: any) => s + (li.qty || 0) * (li.unit_price || 0), 0);
  const booking = invoice.bookings;

  const editable = invoice.status !== 'paid' && invoice.status !== 'void';
  const inputCls = 'h-8 w-full rounded border-transparent bg-transparent px-1.5 text-sm focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/invoices" className="text-sm text-slate-500 hover:text-slate-700 no-underline mb-2 inline-block">← Invoices</Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Invoice — {booking?.contacts?.name ?? '—'}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <InvoiceBadge status={invoice.status} />
          {invoice.status === 'draft' && <button className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => patch({ status: 'sent' })}>Mark sent</button>}
          {invoice.status === 'sent' && <button className="h-8 px-3 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors" onClick={() => patch({ status: 'paid' })}>Mark paid</button>}
          {editable && <button className="h-8 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold border border-red-200 hover:bg-red-100 transition-colors" onClick={() => patch({ status: 'void' })}>Void</button>}
          {editable && <button className="h-8 px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors" onClick={openStripeCheckout} disabled={stripeLoading}>{stripeLoading ? 'Loading…' : 'Get payment link'}</button>}
          <a href={`/api/invoices/${invoice.id}/pdf`} className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center" download>Download PDF</a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Bill to</div>
          <div className="flex flex-col gap-1 text-sm">
            <div className="font-semibold text-slate-900">{booking?.contacts?.name ?? '—'}</div>
            {booking?.contacts?.email && <div className="text-slate-400">{booking.contacts.email}</div>}
            {booking?.contacts?.phone && <div className="text-slate-400">{booking.contacts.phone}</div>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Booking</div>
          <div className="flex flex-col gap-1 text-sm">
            {booking && <Link href={`/bookings/${booking.id}`} className="text-blue-600 font-medium no-underline hover:underline">{new Date(booking.start_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Link>}
            {booking?.address && <div className="text-slate-400">{booking.address}</div>}
            {booking?.workers?.name && <div className="text-slate-400">Worker: {booking.workers.name}</div>}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="text-sm font-bold text-slate-900 mb-4">Line items</div>
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Description', 'Qty', 'Unit price', 'Total', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li: any, i: number) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="px-1.5 py-1"><input className={inputCls} value={li.description} onChange={e => setLineItems(p => p.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} placeholder="Description" disabled={!editable} /></td>
                  <td className="px-1.5 py-1"><input className={inputCls + ' w-14 text-right'} type="number" value={li.qty} onChange={e => setLineItems(p => p.map((x, idx) => idx === i ? { ...x, qty: parseFloat(e.target.value) || 1 } : x))} disabled={!editable} /></td>
                  <td className="px-1.5 py-1"><input className={inputCls + ' w-20 text-right'} type="number" step="0.01" value={li.unit_price} onChange={e => setLineItems(p => p.map((x, idx) => idx === i ? { ...x, unit_price: parseFloat(e.target.value) || 0 } : x))} disabled={!editable} /></td>
                  <td className="px-3 py-2 font-semibold text-right whitespace-nowrap text-slate-800">${((li.qty || 0) * (li.unit_price || 0)).toFixed(2)}</td>
                  <td className="px-1.5 py-1">{editable && <button onClick={() => setLineItems(p => p.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400 text-lg leading-none bg-transparent border-none cursor-pointer">×</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mb-3">
          {editable && <button className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setLineItems(p => [...p, { description: '', qty: 1, unit_price: 0 }])}>+ Add item</button>}
          <div className="ml-auto text-sm text-slate-500">
            Total: <strong className="text-xl font-extrabold tracking-tight text-slate-900">${total.toFixed(2)}</strong>
          </div>
        </div>

        <textarea
          className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 mb-3"
          style={{ minHeight: 56, resize: 'vertical' }}
          placeholder="Notes…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={!editable}
        />

        {editable && (
          <button className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors" onClick={() => patch({ line_items: lineItems, notes })} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {invoice.paid_at && (
        <p className="text-sm text-green-700">Paid on {new Date(invoice.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      )}
    </div>
  );
}
