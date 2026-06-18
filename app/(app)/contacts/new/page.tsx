'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewContactPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: any = { name: fd.get('name') };
    if (fd.get('email')) body.email = fd.get('email');
    if (fd.get('phone')) body.phone = fd.get('phone');
    if (fd.get('address')) body.address = fd.get('address');
    const r = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) { setError(data.error ?? 'Failed to create client.'); setLoading(false); return; }
    router.push(`/contacts/${data.id}`);
  }

  return (
    <div>
      <Link href="/contacts" className="text-sm text-slate-500 hover:text-slate-700 no-underline mb-5 inline-block">← Clients</Link>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-6">New client</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
            <input name="name" required className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" placeholder="Full name" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input name="email" type="email" className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input name="phone" className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" placeholder="+1 555 000 0000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
            <input name="address" className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" placeholder="Street address" />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-3 pt-1">
            <Link href="/contacts" className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors inline-flex items-center">Cancel</Link>
            <button type="submit" disabled={loading} className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Creating…' : 'Create client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
