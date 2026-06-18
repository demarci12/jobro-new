'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function NewBookingForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const prefillStart = sp.get('start') ?? '';
  const prefillContact = sp.get('contact_id') ?? '';

  const [workers, setWorkers] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactId, setContactId] = useState(prefillContact);
  const [contactName, setContactName] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recurrence, setRecurrence] = useState('none');
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const searchTimer = useRef<any>(null);

  useEffect(() => {
    Promise.all([fetch('/api/workers').then(r=>r.json()), fetch('/api/contacts?limit=0').then(r=>r.json())])
      .then(([w]) => setWorkers(w)).catch(() => {});
    fetch('/api/service-types').then(r=>r.ok?r.json():[]).then(setServiceTypes).catch(()=>setServiceTypes([]));
    if (prefillContact) {
      fetch(`/api/contacts/${prefillContact}`).then(r=>r.json()).then(d => { if (d.contact) { setContactName(d.contact.name); setContactSearch(d.contact.name); }});
    }
    return () => clearTimeout(searchTimer.current);
  }, []);

  function handleSearchInput(val: string) {
    setContactSearch(val);
    clearTimeout(searchTimer.current);
    if (val.length < 2) { setShowResults(false); return; }
    searchTimer.current = setTimeout(async () => {
      const r = await fetch(`/api/contacts?q=${encodeURIComponent(val)}&limit=6`);
      const { data } = await r.json();
      setResults(data ?? []);
      setShowResults(true);
    }, 200);
  }

  function selectContact(id: string, name: string) {
    setContactId(id); setContactName(name); setContactSearch(name); setShowResults(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contactId) { setError('Please select a client.'); return; }
    setError(''); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const startVal = fd.get('start_time') as string;
    const endVal = fd.get('end_time') as string;
    const startDate = new Date(startVal);
    let endDate = new Date(endVal);
    if (!endVal || isNaN(endDate.getTime()) || endDate <= startDate) {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }
    const body: any = {
      contact_id: contactId,
      worker_id: fd.get('worker_id'),
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
    };
    if (fd.get('service_type_id')) body.service_type_id = fd.get('service_type_id');
    if (fd.get('address')) body.address = fd.get('address');
    if (fd.get('price')) body.price = parseFloat(fd.get('price') as string);
    if (recurrence !== 'none') { body.recurrence = recurrence; body.recurrence_count = recurrenceCount; }
    const r = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) { setError(data.error ?? 'Failed to create booking.'); setLoading(false); return; }
    // Recurring returns { bookings, created }; single returns { id }
    router.push(data.id ? `/bookings/${data.id}` : '/bookings');
  }

  function handleServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const opt = e.target.options[e.target.selectedIndex] as HTMLOptionElement;
    const dur = parseInt(opt.dataset.duration ?? '0');
    const price = opt.dataset.price;
    const startEl = document.getElementById('start_time') as HTMLInputElement;
    if (dur && startEl?.value) {
      const d = new Date(startEl.value);
      d.setMinutes(d.getMinutes() + dur);
      (document.getElementById('end_time') as HTMLInputElement).value = d.toISOString().slice(0,16);
    }
    if (price) (document.getElementById('price') as HTMLInputElement).value = price;
  }

  const inputCls = 'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5';

  return (
    <div>
      <Link href="/bookings" className="text-sm text-slate-500 hover:text-slate-700 no-underline mb-5 inline-block">← Bookings</Link>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-6">New booking</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-7">

          <Section label="Client">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="8.5" cy="8.5" r="5.5"/><path d="M15 15l-3-3"/>
              </svg>
              <input className={inputCls + ' pl-9'} placeholder="Search client…"
                value={contactSearch} onChange={e => handleSearchInput(e.target.value)}
                onBlur={() => setTimeout(() => setShowResults(false), 150)} />
              {showResults && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg z-20 shadow-md overflow-hidden">
                  {results.map((c: any) => (
                    <div key={c.id} onMouseDown={() => selectContact(c.id, c.name)}
                      className="flex justify-between px-3.5 py-2.5 text-sm cursor-pointer hover:bg-slate-50">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-slate-400">{c.email ?? ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {contactId && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-semibold mt-1.5">
                ✓ {contactName}
              </div>
            )}
          </Section>

          <Section label="Scheduling">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Worker *</label>
                <select name="worker_id" required className={inputCls}>
                  <option value="">Select worker…</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Service type</label>
                <select name="service_type_id" className={inputCls} onChange={handleServiceChange}>
                  <option value="">None</option>
                  {serviceTypes.map((s: any) => (
                    <option key={s.id} value={s.id} data-duration={s.duration_min} data-price={s.base_price}>
                      {s.name} — {s.duration_min} min
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start time *</label>
                <input id="start_time" name="start_time" type="datetime-local" required className={inputCls} defaultValue={prefillStart}
                  onChange={e => {
                    const endEl = document.getElementById('end_time') as HTMLInputElement;
                    if (!endEl.value && e.target.value) {
                      const d = new Date(e.target.value);
                      d.setHours(d.getHours() + 1);
                      endEl.value = d.toISOString().slice(0, 16);
                    }
                  }} />
              </div>
              <div>
                <label className={labelCls}>End time *</label>
                <input id="end_time" name="end_time" type="datetime-local" required className={inputCls} />
              </div>
            </div>
          </Section>

          <Section label="Job details">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Address</label>
                <input name="address" className={inputCls} placeholder="Leave blank to use client address" />
              </div>
              <div>
                <label className={labelCls}>Price ($)</label>
                <input id="price" name="price" type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" />
              </div>
            </div>
          </Section>

          <Section label="Recurring">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Repeat</label>
                <select className={inputCls} value={recurrence} onChange={e => setRecurrence(e.target.value)}>
                  <option value="none">Does not repeat</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {recurrence !== 'none' && (
                <div>
                  <label className={labelCls}>Occurrences</label>
                  <input type="number" min={2} max={52} className={inputCls} value={recurrenceCount} onChange={e => setRecurrenceCount(parseInt(e.target.value) || 2)} />
                  <p className="text-xs text-slate-400 mt-1">Creates {recurrenceCount} bookings · ends {(() => { const d = new Date(); if (recurrence === 'weekly') d.setDate(d.getDate() + 7 * (recurrenceCount - 1)); else if (recurrence === 'fortnightly') d.setDate(d.getDate() + 14 * (recurrenceCount - 1)); else d.setMonth(d.getMonth() + recurrenceCount - 1); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); })()}</p>
                </div>
              )}
            </div>
          </Section>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-3">
            <Link href="/bookings" className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors inline-flex items-center">Cancel</Link>
            <button type="submit" disabled={loading} className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Creating…' : recurrence !== 'none' ? `Create ${recurrenceCount} bookings` : 'Create booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-100">{label}</div>
      {children}
    </div>
  );
}

export default function NewBookingPage() {
  return <Suspense><NewBookingForm /></Suspense>;
}
