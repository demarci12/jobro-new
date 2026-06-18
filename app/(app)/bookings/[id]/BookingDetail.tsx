'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import JobDocumentation from '@/components/JobDocumentation';
import type { Booking, LineItem } from '@/lib/types';

type Tab = 'details' | 'quote' | 'documentation' | 'invoice';

export default function BookingDetail({ booking: initial }: { booking: Booking }) {
  const router = useRouter();
  const [booking, setBooking] = useState(initial);
  const [lineItems, setLineItems] = useState<LineItem[]>(initial.quotes?.[0]?.line_items ?? []);
  const [notes, setNotes] = useState(initial.quotes?.[0]?.notes ?? '');
  const [invoice, setInvoice] = useState(initial.invoices?.[0] ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('details');

  async function reload() {
    try {
      const r = await fetch(`/api/bookings/${booking.id}`);
      if (!r.ok) { setError(`Failed to reload: ${r.status}`); return; }
      const b: Booking = await r.json();
      setBooking(b);
      setLineItems(b.quotes?.[0]?.line_items ?? []);
      setNotes(b.quotes?.[0]?.notes ?? '');
      setInvoice(b.invoices?.[0] ?? null);
    } catch {
      setError('Network error — could not reload booking');
    }
  }

  async function patchStatus(status: string) {
    setError('');
    const r = await fetch(`/api/bookings/${booking.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Status update failed'); return; }
    await reload();
  }

  async function createQuote() {
    setError('');
    const r = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_id: booking.id, line_items: [] }) });
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Failed to create quote'); return; }
    await reload();
  }

  async function saveQuote() {
    setSaving(true);
    setError('');
    const qid = booking?.quotes?.[0]?.id;
    if (!qid) { setSaving(false); return; }
    try {
      const total = lineItems.reduce((s, li) => s + (li.qty || 0) * (li.unit_price || 0), 0);
      const r = await fetch(`/api/quotes/${qid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ line_items: lineItems, total, notes }) });
      if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Save failed'); }
      else await reload();
    } catch {
      setError('Network error — save failed');
    } finally {
      setSaving(false);
    }
  }

  async function setQuoteStatus(status: string) {
    const qid = booking?.quotes?.[0]?.id; if (!qid) return;
    const r = await fetch(`/api/quotes/${qid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Failed to update quote'); return; }
    await reload();
  }

  async function createInvoice() {
    setError('');
    const r = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_id: booking.id }) });
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Failed to create invoice'); return; }
    const inv = await r.json();
    router.push(`/invoices/${inv.id}`);
  }

  const sc = booking.status.toLowerCase().replace('_', '-');
  const quote = booking.quotes?.[0];
  const total = lineItems.reduce((s, li) => s + (li.qty || 0) * (li.unit_price || 0), 0);

  const STATUS_CLS: Record<string, string> = {
    SCHEDULED: 'bg-blue-50 text-blue-700', IN_PROGRESS: 'bg-orange-50 text-orange-700',
    FINISHED: 'bg-green-50 text-green-700', CANCELLED: 'bg-slate-100 text-slate-500', INVOICED: 'bg-purple-50 text-purple-700',
  };
  const inputCls = 'h-8 w-full rounded border-transparent bg-transparent px-1.5 text-sm focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div>
      {booking.google_sync_status !== 'synced' && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg mb-5 text-sm text-amber-700">
          <span>⏱ Calendar sync {booking.google_sync_status === 'failed' ? 'failed — reconnect Google Calendar' : 'pending'}</span>
          {booking.google_sync_status === 'failed' && <a href="/api/auth/google" className="h-7 px-2.5 rounded-md border border-amber-300 text-xs font-medium hover:bg-amber-100 transition-colors">Reconnect</a>}
        </div>
      )}

      {error && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href={`/contacts/${booking.contact_id}`} className="text-sm text-slate-500 hover:text-slate-700 no-underline mb-2 inline-block">← {booking.contacts?.name ?? 'Client'}</Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{new Date(booking.start_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_CLS[booking.status] ?? 'bg-slate-100 text-slate-500'}`}>{booking.status.replace('_', ' ')}</span>
          {booking.status !== 'INVOICED' && booking.status !== 'CANCELLED' && (
            <select className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={booking.status} onChange={e => patchStatus(e.target.value)}>
              {(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'] as const).map(s => <option key={s}>{s}</option>)}
            </select>
          )}
          {booking.status === 'FINISHED' && !invoice && (
            <button className="h-9 px-3 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors" onClick={createInvoice}>Create invoice</button>
          )}
          {invoice && (
            <Link href={`/invoices/${invoice.id}`} className="h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center">View invoice →</Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {(['details', 'quote', 'documentation', 'invoice'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors capitalize ${tab === t ? 'border-blue-600 text-blue-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} bg-transparent cursor-pointer`}
          >
            {t === 'details' ? 'Job details' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'documentation' && (
        <JobDocumentation
          bookingId={booking.id}
          workerName={booking.workers?.name ?? ''}
          customerName={booking.contacts?.name ?? ''}
        />
      )}

      {tab === 'invoice' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          {invoice ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Invoice exists for this booking.</span>
              <Link href={`/invoices/${invoice.id}`} className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center">Open invoice →</Link>
            </div>
          ) : booking.status === 'FINISHED' ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">No invoice yet.</span>
              <button className="h-8 px-3 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors" onClick={createInvoice}>Create invoice</button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Invoice can be created once the job is finished.</p>
          )}
        </div>
      )}

      {tab === 'details' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Job details</h2>
          <div className="flex flex-col gap-2.5">
            <Row label="Time">{new Date(booking.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} – {new Date(booking.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Row>
            <Row label="Client"><Link href={`/contacts/${booking.contact_id}`} className="text-blue-600 no-underline hover:underline">{booking.contacts?.name ?? '—'}</Link></Row>
            <Row label="Worker">{booking.workers?.name ?? '—'}</Row>
            <Row label="Service">{booking.service_types?.name ?? '—'}</Row>
            <Row label="Address">{booking.address ?? '—'}</Row>
            <Row label="Price">{booking.price != null ? `$${parseFloat(booking.price).toFixed(2)}` : '—'}</Row>
            {booking.google_meet_link && <Row label="Meet"><a href={booking.google_meet_link} target="_blank" className="text-blue-600 no-underline hover:underline">Join Google Meet ↗</a></Row>}
          </div>
        </div>
      )}

      {tab === 'quote' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quote</h2>
            {quote && <QuoteBadge status={quote.status} />}
          </div>
          {quote ? (
            <>
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Description', 'Qty', 'Price', 'Total', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-1.5 py-1"><input className={inputCls} value={li.description} onChange={e => setLineItems(prev => prev.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} placeholder="Description" /></td>
                        <td className="px-1.5 py-1"><input className={inputCls + ' w-14 text-right'} type="number" value={li.qty} onChange={e => setLineItems(prev => prev.map((x, idx) => idx === i ? { ...x, qty: parseFloat(e.target.value) || 1 } : x))} /></td>
                        <td className="px-1.5 py-1"><input className={inputCls + ' w-20 text-right'} type="number" value={li.unit_price} step="0.01" onChange={e => setLineItems(prev => prev.map((x, idx) => idx === i ? { ...x, unit_price: parseFloat(e.target.value) || 0 } : x))} /></td>
                        <td className="px-3 py-2 font-semibold text-right whitespace-nowrap text-slate-800">${((li.qty || 0) * (li.unit_price || 0)).toFixed(2)}</td>
                        <td className="px-1.5 py-1"><button onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400 text-lg leading-none bg-transparent border-none cursor-pointer">×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center mb-3">
                <button className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setLineItems(prev => [...prev, { description: '', qty: 1, unit_price: 0 }])}>+ Add item</button>
                <span className="text-sm text-slate-500">Total: <strong className="text-base font-bold text-slate-900">${total.toFixed(2)}</strong></span>
              </div>
              <textarea
                className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 mb-3"
                style={{ minHeight: 56, resize: 'vertical' }}
                placeholder="Notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap">
                <button className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors" onClick={saveQuote} disabled={saving}>{saving ? 'Saving…' : 'Save quote'}</button>
                {quote.status === 'draft' && <button className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors" onClick={() => setQuoteStatus('sent')}>Mark sent</button>}
                {quote.status === 'sent' && <button className="h-8 px-3 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors" onClick={() => setQuoteStatus('accepted')}>Mark accepted</button>}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400 mb-3">No quote yet.</p>
              <button className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors" onClick={createQuote}>Create quote</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm items-baseline">
      <span className="text-xs text-slate-400 w-16 shrink-0">{label}</span>
      <span className="text-slate-800">{children}</span>
    </div>
  );
}

function QuoteBadge({ status }: { status: string }) {
  const cls: Record<string, string> = { draft: 'bg-slate-100 text-slate-500', sent: 'bg-blue-50 text-blue-700', accepted: 'bg-green-50 text-green-700' };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cls[status] ?? cls.draft}`}>{status}</span>;
}
