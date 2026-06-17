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
      <Link href="/contacts" className="back">← Clients</Link>
      <h1 className="page-title" style={{ marginBottom: 24 }}>New client</h1>

      <div className="card" style={{ maxWidth: 520 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="field-group">
            <label className="field-label">Name *</label>
            <input name="name" required className="input" placeholder="Full name" />
          </div>
          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Email</label>
              <input name="email" type="email" className="input" placeholder="email@example.com" />
            </div>
            <div className="field-group">
              <label className="field-label">Phone</label>
              <input name="phone" className="input" placeholder="+1 555 000 0000" />
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Address</label>
            <input name="address" className="input" placeholder="Street address" />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <Link href="/contacts" className="btn ghost">Cancel</Link>
            <button type="submit" className="btn" disabled={loading}>{loading ? 'Creating…' : 'Create client'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
