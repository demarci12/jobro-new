'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import JobDocumentation from '@/components/JobDocumentation';
import type { Booking, LineItem } from '@/lib/types';
import { cn } from '@/lib/utils';

type Tab = 'details' | 'quote' | 'documentation' | 'invoice';

// ── Pipeline steps ────────────────────────────────────────────────────────────
const PIPELINE = [
  { key: 'SCHEDULED',   label: 'Scheduled' },
  { key: '_QUOTED',     label: 'Quoted' },    // virtual — derived from quote status
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'FINISHED',    label: 'Finished' },
  { key: 'INVOICED',    label: 'Invoiced' },
  { key: '_PAID',       label: 'Paid' },      // virtual — derived from invoice status
] as const;

type PipelineKey = typeof PIPELINE[number]['key'];

function getPipelineStep(booking: Booking): PipelineKey {
  const inv = booking.invoices?.[0];
  if (inv?.status === 'paid') return '_PAID';
  if (booking.status === 'INVOICED') return 'INVOICED';
  if (booking.status === 'FINISHED') return 'FINISHED';
  if (booking.status === 'IN_PROGRESS') return 'IN_PROGRESS';
  const q = booking.quotes?.[0];
  if (q && (q.status === 'sent' || q.status === 'accepted')) return '_QUOTED';
  return 'SCHEDULED';
}

function stepIndex(key: PipelineKey) {
  return PIPELINE.findIndex(p => p.key === key);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BookingDetail({ booking: initial }: { booking: Booking }) {
  const router = useRouter();
  const [booking, setBooking] = useState(initial);
  const [lineItems, setLineItems] = useState<LineItem[]>(initial.quotes?.[0]?.line_items ?? []);
  const [notes, setNotes] = useState(initial.quotes?.[0]?.notes ?? '');
  const [invoice, setInvoice] = useState(initial.invoices?.[0] ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>(() => {
    // Default to quote tab when booking is scheduled and has no quote yet
    if (initial.status === 'SCHEDULED' && !initial.quotes?.[0]) return 'quote';
    return 'details';
  });

  async function reload() {
    try {
      const r = await fetch(`/api/bookings/${booking.id}`);
      if (!r.ok) return;
      const b: Booking = await r.json();
      setBooking(b);
      setLineItems(b.quotes?.[0]?.line_items ?? []);
      setNotes(b.quotes?.[0]?.notes ?? '');
      setInvoice(b.invoices?.[0] ?? null);
    } catch { setError('Network error — could not reload'); }
  }

  async function patchStatus(status: string) {
    setError('');
    const r = await fetch(`/api/bookings/${booking.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Status update failed'); return; }
    await reload();
    // Auto-navigate to invoice tab when job is finished
    if (status === 'FINISHED') setTab('invoice');
  }

  async function createQuote() {
    setError('');
    const r = await fetch('/api/quotes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: booking.id, line_items: [] }),
    });
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Failed to create quote'); return; }
    await reload();
    setTab('quote');
  }

  async function saveQuote() {
    setSaving(true); setError('');
    const qid = booking?.quotes?.[0]?.id;
    if (!qid) { setSaving(false); return; }
    try {
      const total = lineItems.reduce((s, li) => s + (li.qty || 0) * (li.unit_price || 0), 0);
      const r = await fetch(`/api/quotes/${qid}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_items: lineItems, total, notes }),
      });
      if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Save failed'); }
      else await reload();
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  }

  async function setQuoteStatus(status: string) {
    const qid = booking?.quotes?.[0]?.id; if (!qid) return;
    const r = await fetch(`/api/quotes/${qid}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Failed to update quote'); return; }
    await reload();
  }

  async function createInvoice() {
    setError('');
    const r = await fetch('/api/invoices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: booking.id }),
    });
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Failed to create invoice'); return; }
    const inv = await r.json();
    router.push(`/invoices/${inv.id}`);
  }

  const quote = booking.quotes?.[0];
  const total = lineItems.reduce((s, li) => s + (li.qty || 0) * (li.unit_price || 0), 0);
  const currentStep = getPipelineStep(booking);
  const currentIdx = stepIndex(currentStep);

  // ── Smart "next action" ────────────────────────────────────────────────────
  const nextAction = (() => {
    if (booking.status === 'CANCELLED') return null;
    if (currentStep === '_PAID') return null;
    if (booking.status === 'SCHEDULED') {
      if (!quote) return {
        label: 'Create quote', desc: 'Build a quote with line items before starting', cta: createQuote,
        color: 'bg-blue-600 hover:bg-blue-700',
      };
      if (quote.status === 'draft') return {
        label: 'Save & send quote', desc: 'Finalise line items then mark as sent to client', cta: async () => { await saveQuote(); await setQuoteStatus('sent'); },
        color: 'bg-blue-600 hover:bg-blue-700',
      };
      if (quote.status === 'sent') return {
        label: 'Mark quote accepted', desc: 'Client approved — ready to start the job', cta: () => setQuoteStatus('accepted'),
        color: 'bg-blue-600 hover:bg-blue-700',
      };
      if (quote.status === 'accepted') return {
        label: 'Start job', desc: 'Quote accepted — mark this booking as in progress', cta: () => patchStatus('IN_PROGRESS'),
        color: 'bg-orange-500 hover:bg-orange-600',
      };
    }
    if (booking.status === 'IN_PROGRESS') return {
      label: 'Mark finished', desc: 'Job is done — ready to invoice', cta: () => patchStatus('FINISHED'),
      color: 'bg-green-600 hover:bg-green-700',
    };
    if (booking.status === 'FINISHED') {
      if (!invoice) return {
        label: 'Create invoice', desc: quote?.status === 'accepted' ? 'Generate invoice from accepted quote' : 'Create an invoice for this job', cta: createInvoice,
        color: 'bg-blue-600 hover:bg-blue-700',
      };
    }
    if (invoice && invoice.status === 'draft') return {
      label: 'Send invoice', desc: 'Mark invoice as sent to client',
      cta: () => router.push(`/invoices/${invoice.id}`),
      color: 'bg-blue-600 hover:bg-blue-700',
    };
    if (invoice && invoice.status === 'sent') return {
      label: 'Mark invoice paid', desc: 'Record payment and close this job',
      cta: () => router.push(`/invoices/${invoice.id}`),
      color: 'bg-green-600 hover:bg-green-700',
    };
    return null;
  })();

  const inputCls = 'h-8 w-full rounded border-transparent bg-transparent px-1.5 text-sm focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb + title */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <Link href={`/contacts/${booking.contact_id}`} className="text-sm text-slate-500 hover:text-slate-700 no-underline mb-1 inline-block">
            ← {booking.contacts?.name ?? 'Client'}
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {new Date(booking.start_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date(booking.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {new Date(booking.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            {booking.workers?.name && ` · ${booking.workers.name}`}
          </p>
        </div>
        {booking.status !== 'INVOICED' && booking.status !== 'CANCELLED' && (
          <select
            className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 mt-1"
            value={booking.status}
            onChange={e => patchStatus(e.target.value)}
          >
            {(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'] as const).map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Google sync warning */}
      {booking.google_sync_status !== 'synced' && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg mb-4 text-sm text-amber-700">
          <span>⏱ Calendar sync {booking.google_sync_status === 'failed' ? 'failed — reconnect Google Calendar' : 'pending'}</span>
          {booking.google_sync_status === 'failed' && (
            <a href="/api/auth/google" className="h-7 px-2.5 rounded-md border border-amber-300 text-xs font-medium hover:bg-amber-100 transition-colors">Reconnect</a>
          )}
        </div>
      )}

      {error && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">{error}</div>
      )}

      {/* ── Pipeline stepper ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-4">
        <div className="flex items-center gap-0">
          {PIPELINE.map((step, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            const isLast = i === PIPELINE.length - 1;
            return (
              <div key={step.key} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center min-w-0">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0',
                    done  ? 'bg-blue-600 text-white' :
                    active ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                             'bg-slate-100 text-slate-400'
                  )}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={cn(
                    'text-xs mt-1 text-center leading-tight',
                    active ? 'font-semibold text-blue-700' :
                    done   ? 'text-slate-500' : 'text-slate-300'
                  )}>
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div className={cn('flex-1 h-0.5 mb-3 mx-1', done ? 'bg-blue-600' : 'bg-slate-100')} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Next action banner ───────────────────────────────────────────────── */}
      {nextAction && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-5 py-3.5 mb-4">
          <div>
            <div className="text-sm font-semibold text-blue-900">{nextAction.label}</div>
            <div className="text-xs text-blue-600 mt-0.5">{nextAction.desc}</div>
          </div>
          <button
            onClick={nextAction.cta}
            disabled={saving}
            className={cn('h-9 px-4 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 shrink-0 ml-4', nextAction.color)}
          >
            {saving ? 'Working…' : nextAction.label} →
          </button>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 mb-5">
        {([
          { id: 'details' as Tab, label: 'Job details' },
          { id: 'quote' as Tab, label: `Quote${quote ? ` · ${quote.status}` : ''}` },
          { id: 'invoice' as Tab, label: `Invoice${invoice ? ` · ${invoice.status}` : ''}` },
          { id: 'documentation' as Tab, label: 'Documentation' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors bg-transparent cursor-pointer',
              tab === t.id
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Job details ─────────────────────────────────────────────────── */}
      {tab === 'details' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <DetailRow label="Client">
              <Link href={`/contacts/${booking.contact_id}`} className="text-blue-600 no-underline hover:underline font-medium">
                {booking.contacts?.name ?? '—'}
              </Link>
            </DetailRow>
            <DetailRow label="Worker">{booking.workers?.name ?? '—'}</DetailRow>
            <DetailRow label="Service">{booking.service_types?.name ?? '—'}</DetailRow>
            <DetailRow label="Price">{booking.price != null ? `$${parseFloat(booking.price).toFixed(2)}` : '—'}</DetailRow>
            <DetailRow label="Address" wide>{booking.address ?? (booking.contacts as any)?.address ?? '—'}</DetailRow>
            {booking.google_meet_link && (
              <DetailRow label="Meet" wide>
                <a href={booking.google_meet_link} target="_blank" className="text-blue-600 no-underline hover:underline">
                  Join Google Meet ↗
                </a>
              </DetailRow>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Quote ───────────────────────────────────────────────────────── */}
      {tab === 'quote' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          {!quote ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No quote yet</h3>
              <p className="text-sm text-slate-400 mb-4">Create a quote with line items to send to the client.</p>
              <button
                onClick={createQuote}
                className="h-9 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Create quote
              </button>
            </div>
          ) : (
            <>
              {/* Quote status bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Quote</span>
                  <QuoteStatusBadge status={quote.status} />
                </div>
                <div className="flex gap-1.5">
                  {quote.status === 'draft' && (
                    <button onClick={() => setQuoteStatus('sent')} className="h-7 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                      Mark sent
                    </button>
                  )}
                  {quote.status === 'sent' && (
                    <button onClick={() => setQuoteStatus('accepted')} className="h-7 px-3 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors">
                      Mark accepted
                    </button>
                  )}
                  {quote.status === 'accepted' && !invoice && (
                    <button onClick={createInvoice} className="h-7 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                      Create invoice →
                    </button>
                  )}
                </div>
              </div>

              {/* Line items table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide w-24">Unit price</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide w-20">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-400">
                          No line items yet — add one below.
                        </td>
                      </tr>
                    )}
                    {lineItems.map((li, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-1.5 py-1">
                          <input
                            className={inputCls}
                            value={li.description}
                            onChange={e => setLineItems(p => p.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                            placeholder="e.g. Labour, 3 hours"
                          />
                        </td>
                        <td className="px-1.5 py-1">
                          <input
                            className={inputCls + ' text-right'}
                            type="number" min="0" step="1"
                            value={li.qty}
                            onChange={e => setLineItems(p => p.map((x, idx) => idx === i ? { ...x, qty: parseFloat(e.target.value) || 1 } : x))}
                          />
                        </td>
                        <td className="px-1.5 py-1">
                          <input
                            className={inputCls + ' text-right'}
                            type="number" min="0" step="0.01"
                            value={li.unit_price}
                            onChange={e => setLineItems(p => p.map((x, idx) => idx === i ? { ...x, unit_price: parseFloat(e.target.value) || 0 } : x))}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-800 whitespace-nowrap">
                          ${((li.qty || 0) * (li.unit_price || 0)).toFixed(2)}
                        </td>
                        <td className="px-1.5 py-1 text-center">
                          <button onClick={() => setLineItems(p => p.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400 text-lg leading-none">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setLineItems(p => [...p, { description: '', qty: 1, unit_price: 0 }])}
                  className="h-8 px-3 rounded-lg border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  + Add line item
                </button>
                <div className="text-right">
                  <span className="text-xs text-slate-400 mr-2">Total</span>
                  <span className="text-xl font-extrabold tracking-tight text-slate-900">${total.toFixed(2)}</span>
                </div>
              </div>

              <textarea
                className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 mb-3"
                style={{ minHeight: 56, resize: 'vertical' }}
                placeholder="Notes for the client…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />

              <button
                onClick={saveQuote}
                disabled={saving}
                className="h-8 px-4 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save quote'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Invoice ─────────────────────────────────────────────────────── */}
      {tab === 'invoice' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          {invoice ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800">Invoice created</div>
                <div className="flex items-center gap-2 mt-1">
                  <InvoiceStatusBadge status={invoice.status} />
                  {invoice.status === 'paid' && (
                    <span className="text-xs text-green-600 font-medium">✓ Job complete</span>
                  )}
                </div>
              </div>
              <Link
                href={`/invoices/${invoice.id}`}
                className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center no-underline"
              >
                Open invoice →
              </Link>
            </div>
          ) : booking.status === 'FINISHED' ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🧾</div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No invoice yet</h3>
              <p className="text-sm text-slate-400 mb-4">
                {quote?.status === 'accepted'
                  ? 'Quote accepted — line items will be copied to the invoice.'
                  : 'Create an invoice directly or accept the quote first.'}
              </p>
              <button
                onClick={createInvoice}
                className="h-9 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                {quote?.status === 'accepted' ? 'Create invoice from quote' : 'Create invoice'}
              </button>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-sm text-slate-400">Invoice can be created once the job is marked finished.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Documentation ───────────────────────────────────────────────── */}
      {tab === 'documentation' && (
        <JobDocumentation
          bookingId={booking.id}
          workerName={booking.workers?.name ?? ''}
          customerName={booking.contacts?.name ?? ''}
        />
      )}
    </div>
  );
}

function DetailRow({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-0.5', wide && 'col-span-2')}>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className="text-sm text-slate-800">{children}</span>
    </div>
  );
}

function QuoteStatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-500',
    sent: 'bg-blue-50 text-blue-700',
    accepted: 'bg-green-50 text-green-700',
  };
  return <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', cls[status] ?? cls.draft)}>{status}</span>;
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-500',
    sent: 'bg-blue-50 text-blue-700',
    paid: 'bg-green-50 text-green-700',
    void: 'bg-red-50 text-red-600',
  };
  return <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', cls[status] ?? cls.draft)}>{status}</span>;
}
