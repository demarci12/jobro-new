'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import JobDocumentation from '@/components/JobDocumentation';

type Tab = 'details' | 'quote' | 'documentation' | 'invoice';

export default function BookingDetail({ booking: initial }: { booking: any }) {
  const router = useRouter();
  const [booking, setBooking] = useState(initial);
  const [lineItems, setLineItems] = useState<any[]>(initial.quotes?.[0]?.line_items ?? []);
  const [notes, setNotes] = useState(initial.quotes?.[0]?.notes ?? '');
  const [invoice, setInvoice] = useState<any>(initial.invoices?.[0] ?? null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('details');

  async function reload() {
    const r = await fetch(`/api/bookings/${booking.id}`);
    const b = await r.json();
    setBooking(b);
    setLineItems(b.quotes?.[0]?.line_items ?? []);
    setNotes(b.quotes?.[0]?.notes ?? '');
    setInvoice(b.invoices?.[0] ?? null);
  }

  async function patchStatus(status: string) {
    await fetch(`/api/bookings/${booking.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    reload();
  }

  async function createQuote() {
    await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_id: booking.id, line_items: [] }) });
    reload();
  }

  async function saveQuote() {
    setSaving(true);
    const qid = booking?.quotes?.[0]?.id; if (!qid) { setSaving(false); return; }
    const total = lineItems.reduce((s: number, li: any) => s + (li.qty||0) * (li.unit_price||0), 0);
    await fetch(`/api/quotes/${qid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ line_items: lineItems, total, notes }) });
    setSaving(false);
  }

  async function setQuoteStatus(status: string) {
    const qid = booking?.quotes?.[0]?.id; if (!qid) return;
    await fetch(`/api/quotes/${qid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    reload();
  }

  async function createInvoice() {
    const r = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_id: booking.id }) });
    if (r.ok) { const inv = await r.json(); router.push(`/invoices/${inv.id}`); }
  }

  const sc = booking.status.toLowerCase().replace('_', '-');
  const quote = booking.quotes?.[0];
  const total = lineItems.reduce((s: number, li: any) => s + (li.qty||0) * (li.unit_price||0), 0);

  return (
    <div>
      {booking.google_sync_status !== 'synced' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#92400e' }}>
          <span>⏱ Calendar sync {booking.google_sync_status === 'failed' ? 'failed — reconnect Google Calendar' : 'pending'}</span>
          {booking.google_sync_status === 'failed' && <a href="/api/auth/google" className="btn ghost small">Reconnect</a>}
        </div>
      )}

      <div className="page-header">
        <div>
          <Link href={`/contacts/${booking.contact_id}`} className="back">← {booking.contacts?.name ?? 'Client'}</Link>
          <h1 className="page-title">{new Date(booking.start_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge badge-${sc}`}>{booking.status.replace('_',' ')}</span>
          {booking.status !== 'INVOICED' && (
            <select className="input" style={{ width: 'auto', fontSize: 13, padding: '6px 10px' }} value={booking.status} onChange={e => patchStatus(e.target.value)}>
              {['SCHEDULED','IN_PROGRESS','FINISHED','CANCELLED'].map(s => <option key={s}>{s}</option>)}
            </select>
          )}
          {booking.status === 'FINISHED' && !invoice && (
            <button className="btn small" style={{ background: '#16a34a' }} onClick={createInvoice}>Create invoice</button>
          )}
          {invoice && (
            <Link href={`/invoices/${invoice.id}`} className="btn ghost small">View invoice →</Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
        {(['details', 'quote', 'documentation', 'invoice'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 16px', fontSize: 14,
            fontWeight: tab === t ? 600 : 500,
            color: tab === t ? 'var(--blue)' : 'var(--ink)',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            borderBottom: `2px solid ${tab === t ? 'var(--blue)' : 'transparent'}`,
            background: 'none',
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
            textTransform: 'capitalize',
          }}>
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
        <div className="card">
          {invoice ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14 }}>Invoice exists for this booking.</span>
              <Link href={`/invoices/${invoice.id}`} className="btn ghost small">Open invoice →</Link>
            </div>
          ) : booking.status === 'FINISHED' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>No invoice yet.</span>
              <button className="btn small" style={{ background: '#16a34a' }} onClick={createInvoice}>Create invoice</button>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>Invoice can be created once the job is finished.</p>
          )}
        </div>
      )}

      {tab === 'details' && (
        <div className="card">
          <div className="card-header">Job details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row label="Time">{new Date(booking.start_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} – {new Date(booking.end_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</Row>
            <Row label="Client"><Link href={`/contacts/${booking.contact_id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{booking.contacts?.name ?? '—'}</Link></Row>
            <Row label="Worker">{booking.workers?.name ?? '—'}</Row>
            <Row label="Service">{booking.service_types?.name ?? '—'}</Row>
            <Row label="Address">{booking.address ?? '—'}</Row>
            <Row label="Price">{booking.price != null ? `$${parseFloat(booking.price).toFixed(2)}` : '—'}</Row>
            {booking.google_meet_link && <Row label="Meet"><a href={booking.google_meet_link} target="_blank" style={{ color: '#2563eb', textDecoration: 'none' }}>Join Google Meet ↗</a></Row>}
          </div>
        </div>
      )}

      {tab === 'quote' && (
        <div className="card">
          <div className="card-header">
            Quote
            {quote && <QuoteBadge status={quote.status} />}
          </div>
          {quote ? (
            <>
              <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--canvas)' }}>
                      {['Description','Qty','Price','Total',''].map(h => (
                        <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--line)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '3px 4px' }}><input className="input" style={{ border: '1px solid transparent', padding: '4px 6px', fontSize: 13 }} value={li.description} onChange={e => setLineItems(prev => prev.map((x,idx) => idx===i ? {...x, description: e.target.value} : x))} placeholder="Description" /></td>
                        <td style={{ padding: '3px 4px' }}><input className="input" style={{ border: '1px solid transparent', width: 60, textAlign: 'right', padding: '4px 6px', fontSize: 13 }} type="number" value={li.qty} onChange={e => setLineItems(prev => prev.map((x,idx) => idx===i ? {...x, qty: parseFloat(e.target.value)||1} : x))} /></td>
                        <td style={{ padding: '3px 4px' }}><input className="input" style={{ border: '1px solid transparent', width: 72, textAlign: 'right', padding: '4px 6px', fontSize: 13 }} type="number" value={li.unit_price} step="0.01" onChange={e => setLineItems(prev => prev.map((x,idx) => idx===i ? {...x, unit_price: parseFloat(e.target.value)||0} : x))} /></td>
                        <td style={{ padding: '3px 8px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>${((li.qty||0)*(li.unit_price||0)).toFixed(2)}</td>
                        <td style={{ padding: '3px 4px' }}><button onClick={() => setLineItems(prev => prev.filter((_,idx)=>idx!==i))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <button className="btn ghost small" onClick={() => setLineItems(prev => [...prev, { description: '', qty: 1, unit_price: 0 }])}>+ Add item</button>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>Total: <strong style={{ fontSize: 16, color: 'var(--ink)' }}>${total.toFixed(2)}</strong></span>
              </div>
              <textarea className="input" style={{ minHeight: 60, resize: 'vertical', marginBottom: 10, fontSize: 13 }} placeholder="Notes…" value={notes} onChange={e => setNotes(e.target.value)} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn ghost small" onClick={saveQuote} disabled={saving}>{saving ? 'Saving…' : 'Save quote'}</button>
                {quote.status === 'draft' && <button className="btn small" onClick={() => setQuoteStatus('sent')}>Mark sent</button>}
                {quote.status === 'sent'  && <button className="btn small" onClick={() => setQuoteStatus('accepted')}>Mark accepted</button>}
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>No quote yet.</p>
              <button className="btn ghost small" onClick={createQuote}>Create quote</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 14, alignItems: 'baseline' }}>
      <span style={{ color: 'var(--muted)', fontSize: 12, width: 60, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--ink)' }}>{children}</span>
    </div>
  );
}

function QuoteBadge({ status }: { status: string }) {
  const map: Record<string, [string,string]> = { draft: ['#f5f5f5','#737373'], sent: ['#eff6ff','#1d4ed8'], accepted: ['#f0fdf4','#15803d'] };
  const [bg, color] = map[status] ?? map.draft;
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: bg, color, textTransform: 'capitalize' }}>{status}</span>;
}
