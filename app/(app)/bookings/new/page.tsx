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
    const r = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) { setError(data.error ?? 'Failed to create booking.'); setLoading(false); return; }
    router.push(`/bookings/${data.id}`);
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

  return (
    <div>
      <Link href="/bookings" className="back">← Bookings</Link>
      <h1 className="page-title" style={{ marginBottom: 24 }}>New booking</h1>
      <div className="card" style={{ maxWidth: 680 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          <Section label="Client">
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}
                width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="8.5" cy="8.5" r="5.5"/><path d="M15 15l-3-3"/>
              </svg>
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Search client…"
                value={contactSearch} onChange={e => handleSearchInput(e.target.value)}
                onBlur={() => setTimeout(() => setShowResults(false), 150)} />
              {showResults && results.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8,
                  zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', overflow: 'hidden',
                }}>
                  {results.map((c: any) => (
                    <div key={c.id} onMouseDown={() => selectContact(c.id, c.name)}
                      style={{ padding: '10px 14px', fontSize: 14, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{c.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{c.email ?? ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {contactId && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#f0fdf4', color: '#15803d', borderRadius: 999, fontSize: 13, fontWeight: 600, marginTop: 6 }}>
                ✓ {contactName}
              </div>
            )}
          </Section>

          <Section label="Scheduling">
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Worker *</label>
                <select name="worker_id" required className="input">
                  <option value="">Select worker…</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Service type</label>
                <select name="service_type_id" className="input" onChange={handleServiceChange}>
                  <option value="">None</option>
                  {serviceTypes.map((s: any) => (
                    <option key={s.id} value={s.id} data-duration={s.duration_min} data-price={s.base_price}>
                      {s.name} — {s.duration_min} min
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Start time *</label>
                <input id="start_time" name="start_time" type="datetime-local" required className="input" defaultValue={prefillStart}
                  onChange={e => {
                    const endEl = document.getElementById('end_time') as HTMLInputElement;
                    if (!endEl.value && e.target.value) {
                      const d = new Date(e.target.value);
                      d.setHours(d.getHours() + 1);
                      endEl.value = d.toISOString().slice(0, 16);
                    }
                  }} />
              </div>
              <div className="field-group">
                <label className="field-label">End time *</label>
                <input id="end_time" name="end_time" type="datetime-local" required className="input" />
              </div>
            </div>
          </Section>

          <Section label="Job details">
            <div className="field-row">
              <div className="field-group" style={{ flex: 2 }}>
                <label className="field-label">Address</label>
                <input name="address" className="input" placeholder="Leave blank to use client address" />
              </div>
              <div className="field-group">
                <label className="field-label">Price ($)</label>
                <input id="price" name="price" type="number" min="0" step="0.01" className="input" placeholder="0.00" />
              </div>
            </div>
          </Section>

          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <Link href="/bookings" className="btn ghost">Cancel</Link>
            <button type="submit" className="btn" disabled={loading}>{loading ? 'Creating…' : 'Create booking'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', paddingBottom: 4, borderBottom: '1px solid var(--line)' }}>{label}</div>
      {children}
    </div>
  );
}

export default function NewBookingPage() {
  return <Suspense><NewBookingForm /></Suspense>;
}
