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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your clients and booking history</p>
        </div>
        <Link href="/contacts/new" className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center">+ Add client</Link>
      </div>

      <div className="relative max-w-sm mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="8.5" cy="8.5" r="5.5"/><path d="M15 15l-3-3"/>
        </svg>
        <input
          className="flex h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          placeholder="Search clients…"
          value={q}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      <p className="text-xs text-slate-400 mb-3">
        {total} client{total !== 1 ? 's' : ''}{q ? ` matching "${q}"` : ''}
      </p>

      <div className="flex flex-col gap-1.5" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
        {contacts.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            {q ? `No clients found for "${q}"` : (
              <>
                No clients yet.
                <div className="mt-4"><Link href="/contacts/new" className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center">Add your first client</Link></div>
              </>
            )}
          </div>
        ) : contacts.map((c: any) => {
          const initials = c.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase();
          const count = c.bookings?.[0]?.count ?? 0;
          return (
            <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-4 px-4 py-3.5 bg-white border border-slate-200 rounded-xl no-underline hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 text-sm font-bold shrink-0 flex items-center justify-center">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                <div className="flex gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                  {c.address && <span>{c.address}</span>}
                </div>
              </div>
              <div className="text-center shrink-0">
                <div className="text-lg font-bold text-slate-800 leading-none">{count}</div>
                <div className="text-xs text-slate-400 mt-0.5">booking{count !== 1 ? 's' : ''}</div>
              </div>
              <svg className="text-slate-300" width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 5l5 5-5 5"/></svg>
            </Link>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button className="h-8 px-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors" disabled={page <= 1} onClick={() => search(q, page - 1)}>← Prev</button>
          <span className="text-sm text-slate-400">Page {page} of {pages}</span>
          <button className="h-8 px-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors" disabled={page >= pages} onClick={() => search(q, page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
