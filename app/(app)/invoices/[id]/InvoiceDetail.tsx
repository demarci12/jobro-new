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

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/invoices" className="back">← Invoices</Link>
          <h1 className="page-title">Invoice — {booking?.contacts?.name ?? '—'}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InvoiceBadge status={invoice.status} />
          {invoice.status === 'draft' && <button className="btn small" onClick={() => patch({ status: 'sent' })}>Mark sent</button>}
          {invoice.status === 'sent' && <button className="btn small" style={{ background: '#16a34a' }} onClick={() => patch({ status: 'paid' })}>Mark paid</button>}
          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <button className="btn small danger" onClick={() => patch({ status: 'void' })}>Void</button>
          )}
          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <button className="btn small" style={{ background: '#635bff' }} onClick={openStripeCheckout} disabled={stripeLoading}>
              {stripeLoading ? 'Loading…' : 'Get payment link'}
            </button>
          )}
          <a href={`/api/invoices/${invoice.id}/pdf`} className="btn ghost small" download>Download PDF</a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Bill to</div>
          <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontWeight: 600 }}>{booking?.contacts?.name ?? '—'}</div>
            {booking?.contacts?.email && <div style={{ color: 'var(--muted)' }}>{booking.contacts.email}</div>}
            {booking?.contacts?.phone && <div style={{ color: 'var(--muted)' }}>{booking.contacts.phone}</div>}
          </div>
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Booking</div>
          <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {booking && (
              <Link href={`/bookings/${booking.id}`} style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 500 }}>
                {new Date(booking.start_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Link>
            )}
            {booking?.address && <div style={{ color: 'var(--muted)' }}>{booking.address}</div>}
            {booking?.workers?.name && <div style={{ color: 'var(--muted)' }}>Worker: {booking.workers.name}</div>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Line items</div>
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--canvas)' }}>
                {['Description', 'Qty', 'Unit price', 'Total', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '4px 6px' }}>
                    <input className="input" style={{ border: '1px solid transparent', fontSize: 13, padding: '4px 6px' }} value={li.description} onChange={e => setLineItems(p => p.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} placeholder="Description" disabled={invoice.status === 'paid' || invoice.status === 'void'} />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input className="input" style={{ border: '1px solid transparent', width: 60, textAlign: 'right', fontSize: 13, padding: '4px 6px' }} type="number" value={li.qty} onChange={e => setLineItems(p => p.map((x, idx) => idx === i ? { ...x, qty: parseFloat(e.target.value) || 1 } : x))} disabled={invoice.status === 'paid' || invoice.status === 'void'} />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input className="input" style={{ border: '1px solid transparent', width: 80, textAlign: 'right', fontSize: 13, padding: '4px 6px' }} type="number" step="0.01" value={li.unit_price} onChange={e => setLineItems(p => p.map((x, idx) => idx === i ? { ...x, unit_price: parseFloat(e.target.value) || 0 } : x))} disabled={invoice.status === 'paid' || invoice.status === 'void'} />
                  </td>
                  <td style={{ padding: '4px 10px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>${((li.qty || 0) * (li.unit_price || 0)).toFixed(2)}</td>
                  <td style={{ padding: '4px 6px' }}>
                    {invoice.status !== 'paid' && invoice.status !== 'void' && (
                      <button onClick={() => setLineItems(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          {invoice.status !== 'paid' && invoice.status !== 'void' && (
            <button className="btn ghost small" onClick={() => setLineItems(p => [...p, { description: '', qty: 1, unit_price: 0 }])}>+ Add item</button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--muted)' }}>
            Total: <strong style={{ fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.02em' }}>${total.toFixed(2)}</strong>
          </div>
        </div>

        <textarea className="input" style={{ minHeight: 60, resize: 'vertical', marginBottom: 12, fontSize: 13 }} placeholder="Notes…" value={notes} onChange={e => setNotes(e.target.value)} disabled={invoice.status === 'paid' || invoice.status === 'void'} />

        {invoice.status !== 'paid' && invoice.status !== 'void' && (
          <button className="btn ghost small" onClick={() => patch({ line_items: lineItems, notes })} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {invoice.paid_at && (
        <p style={{ fontSize: 13, color: '#15803d' }}>Paid on {new Date(invoice.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      )}
    </div>
  );
}
