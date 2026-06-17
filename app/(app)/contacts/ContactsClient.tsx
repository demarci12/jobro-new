'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ContactsClient({ initialData, initialTotal }: { initialData: any[]; initialTotal: number }) {
  const [contacts, setContacts] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function search(query: string, p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ q: query, page: String(p), limit: '20' });
    const r = await fetch(`/api/contacts?${params}`);
    const { data, total } = await r.json();
    setContacts(data ?? []);
    setTotal(total ?? 0);
    setPage(p);
    setLoading(false);
  }

  function handleSearch(val: string) {
    setQ(val);
    clearTimeout((window as any).__contactTimer);
    (window as any).__contactTimer = setTimeout(() => search(val, 1), val ? 200 : 0);
  }

  const pages = Math.ceil(total / 20);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 2 }}>Manage your clients and booking history</p>
        </div>
        <Link href="/contacts/new" className="btn">+ Add client</Link>
      </div>

      <div style={{ position: 'relative', maxWidth: 400, marginBottom: 20 }}>
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}
          width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="8.5" cy="8.5" r="5.5"/><path d="M15 15l-3-3"/>
        </svg>
        <input className="input" style={{ paddingLeft: 36 }} placeholder="Search clients…"
          value={q} onChange={e => handleSearch(e.target.value)} />
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
        {total} client{total !== 1 ? 's' : ''}{q ? ` matching "${q}"` : ''}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
        {contacts.length === 0 ? (
          <div className="empty-state">
            {q ? `No clients found for "${q}"` : 'No clients yet.'}
            {!q && <><br /><Link href="/contacts/new" className="btn" style={{ marginTop: 16 }}>Add your first client</Link></>}
          </div>
        ) : contacts.map((c: any) => {
          const initials = c.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase();
          const count = c.bookings?.[0]?.count ?? 0;
          return (
            <Link key={c.id} href={`/contacts/${c.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10,
              textDecoration: 'none', color: 'var(--ink)', transition: 'border-color 0.12s, box-shadow 0.12s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#2563eb'; el.style.boxShadow = '0 1px 8px rgba(37,99,235,0.08)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--line)'; el.style.boxShadow = 'none'; }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e8eeff', color: '#2563eb', fontSize: 14, fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', marginTop: 2, flexWrap: 'wrap' }}>
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                  {c.address && <span>{c.address}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>booking{count !== 1 ? 's' : ''}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--muted)" strokeWidth="1.5"><path d="M7 5l5 5-5 5"/></svg>
            </Link>
          );
        })}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          <button className="btn ghost small" disabled={page <= 1} onClick={() => search(q, page - 1)}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Page {page} of {pages}</span>
          <button className="btn ghost small" disabled={page >= pages} onClick={() => search(q, page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
