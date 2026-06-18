'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ContactDetail({ contact: initial, bookings, total }: { contact: any; bookings: any[]; total: number }) {
  const router = useRouter();
  const [contact, setContact] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: initial.name ?? '', email: initial.email ?? '', phone: initial.phone ?? '', address: initial.address ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    const r = await fetch(`/api/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Save failed'); setSaving(false); return; }
    const updated = await r.json();
    setContact(updated);
    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  const BOOKING_STATUS: Record<string, string> = {
    SCHEDULED: 'bg-blue-50 text-blue-700', IN_PROGRESS: 'bg-orange-50 text-orange-700',
    FINISHED: 'bg-green-50 text-green-700', CANCELLED: 'bg-slate-100 text-slate-500', INVOICED: 'bg-purple-50 text-purple-700',
  };
  const QUOTE_STATUS: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-500', sent: 'bg-blue-50 text-blue-700', accepted: 'bg-green-50 text-green-700',
  };

  const inputCls = 'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/contacts" className="text-sm text-slate-500 hover:text-slate-700 no-underline mb-2 inline-block">← Clients</Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{contact.name}</h1>
        </div>
        <Link href={`/bookings/new?contact_id=${contact.id}`} className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center">+ New booking</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contact details</h2>
            {!editing ? (
              <button
                onClick={() => { setForm({ name: contact.name ?? '', email: contact.email ?? '', phone: contact.phone ?? '', address: contact.address ?? '' }); setEditing(true); setError(''); }}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <span className="text-slate-200">|</span>
                <button onClick={() => { setEditing(false); setError(''); }} className="text-xs font-medium text-slate-400 hover:text-slate-600">
                  Cancel
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="flex flex-col gap-2.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name</label>
                <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input className={inputCls} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Phone</label>
                <input className={inputCls} type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 0000" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Address</label>
                <input className={inputCls} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Street, City, Postcode" />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {contact.email && <Row label="Email"><a href={`mailto:${contact.email}`} className="text-blue-600 no-underline hover:underline">{contact.email}</a></Row>}
              {contact.phone && <Row label="Phone"><a href={`tel:${contact.phone}`} className="text-blue-600 no-underline hover:underline">{contact.phone}</a></Row>}
              {contact.address && <Row label="Address"><span>{contact.address}</span></Row>}
              {!contact.email && !contact.phone && !contact.address && (
                <span className="text-sm text-slate-400">No details on file — <button onClick={() => setEditing(true)} className="text-blue-600 hover:underline bg-transparent border-none cursor-pointer p-0 text-sm">add now</button></span>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-center">
          <div className="text-4xl font-extrabold tracking-tight text-slate-900">{total}</div>
          <div className="text-xs text-slate-400 mt-1">Total bookings</div>
        </div>
      </div>

      <h2 className="text-sm font-bold text-slate-900 mb-3">Booking history</h2>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {['Date & time', 'Worker', 'Service', 'Quote', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-slate-400 py-10 text-sm">No bookings yet</td></tr>
            ) : bookings.map((b: any) => {
              const q = b.quotes?.[0];
              return (
                <tr key={b.id} onClick={() => router.push(`/bookings/${b.id}`)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{new Date(b.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div className="text-xs text-slate-400">{new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{b.workers?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{b.service_types?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {q ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${QUOTE_STATUS[q.status] ?? QUOTE_STATUS.draft}`}>{q.status}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${BOOKING_STATUS[b.status] ?? 'bg-slate-100 text-slate-500'}`}>{b.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm items-baseline">
      <span className="text-xs text-slate-400 w-14 shrink-0">{label}</span>
      {children}
    </div>
  );
}
