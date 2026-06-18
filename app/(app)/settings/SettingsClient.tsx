'use client';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type Tab = 'general' | 'security' | 'team' | 'integrations' | 'billing';

interface Props {
  user: { email?: string; full_name?: string } | null;
  gcalConnected: boolean;
  gcalRevoked: boolean;
  gcalExpires: string | null;
}

export default function SettingsClient({ user, gcalConnected, gcalRevoked, gcalExpires }: Props) {
  const [tab, setTab] = useState<Tab>('general');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'security', label: 'Security' },
    { id: 'team', label: 'Team' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'billing', label: 'Billing' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-6">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 mb-8">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-lg">
        {tab === 'general' && <GeneralTab user={user} />}
        {tab === 'security' && <SecurityTab user={user} />}
        {tab === 'team' && <TeamTab />}
        {tab === 'integrations' && (
          <IntegrationsTab connected={gcalConnected} revoked={gcalRevoked} expires={gcalExpires} />
        )}
        {tab === 'billing' && <BillingTab />}
      </div>
    </div>
  );
}

function GeneralTab({ user }: { user: Props['user'] }) {
  const [name, setName] = useState(user?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/settings/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name }),
    });
    setSaving(false);
    setMsg(res.ok ? 'Saved.' : 'Failed to save.');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Profile</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              value={user?.email ?? ''}
              disabled
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {msg && <span className="text-sm text-slate-500">{msg}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

function SecurityTab({ user }: { user: Props['user'] }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/settings/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: current, new_password: next }),
    });
    setSaving(false);
    if (res.ok) { setMsg('Password updated.'); setCurrent(''); setNext(''); }
    else { const d = await res.json(); setMsg(d.error ?? 'Failed to update password.'); }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Change password</h2>
      {user?.email ? (
        <form onSubmit={handleChange} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Current password</label>
            <input
              type="password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
            <input
              type="password"
              value={next}
              onChange={e => setNext(e.target.value)}
              required
              minLength={8}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Updating…' : 'Update password'}
            </button>
            {msg && <span className="text-sm text-slate-500">{msg}</span>}
          </div>
        </form>
      ) : (
        <p className="text-sm text-slate-500">Password change is not available for OAuth accounts.</p>
      )}
    </div>
  );
}

function IntegrationsTab({ connected, revoked, expires }: { connected: boolean; revoked: boolean; expires: string | null }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-1">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="16" height="15" rx="2"/><path d="M2 8h16M6 2v2M14 2v2"/></svg>
        <h2 className="text-sm font-semibold text-slate-900">Google Calendar</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">Connect your Google account so bookings automatically appear on worker calendars.</p>
      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${connected ? 'bg-green-500' : revoked ? 'bg-red-500' : 'bg-slate-300'}`} />
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-800">
            {connected ? 'Connected' : revoked ? 'Disconnected' : 'Not connected'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {connected && expires ? `Token expires ${new Date(expires).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` :
             revoked ? 'Token revoked — bookings are not syncing.' :
             'Connect to sync bookings to worker calendars.'}
          </div>
        </div>
        <a
          href="/api/auth/google"
          className="h-8 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 inline-flex items-center transition-colors"
        >
          {connected ? 'Reconnect' : 'Connect →'}
        </a>
      </div>

    </div>
  );
}

interface Worker { id: string; name: string; email: string | null; google_calendar_id: string | null; }

function TeamTab() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCal, setNewCal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Omit<Worker, 'id'>>({ name: '', email: null, google_calendar_id: null });

  async function load() {
    setLoading(true);
    const r = await fetch('/api/workers');
    if (r.ok) setWorkers(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addWorker(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const r = await fetch('/api/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, email: newEmail, google_calendar_id: newCal }),
    });
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Failed to add worker'); }
    else { setAdding(false); setNewName(''); setNewEmail(''); setNewCal(''); await load(); }
    setSaving(false);
  }

  async function saveEdit(id: string) {
    setSaving(true); setError('');
    const r = await fetch(`/api/workers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Failed to save'); }
    else { setEditId(null); await load(); }
    setSaving(false);
  }

  async function deleteWorker(id: string) {
    if (!confirm('Remove this worker?')) return;
    await fetch(`/api/workers/${id}`, { method: 'DELETE' });
    await load();
  }

  const inputCls = 'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Workers</h2>
            <p className="text-xs text-slate-500 mt-0.5">People who carry out jobs and appear on the calendar.</p>
          </div>
          <button
            onClick={() => { setAdding(true); setError(''); }}
            className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            + Add worker
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-6 text-sm text-slate-400 text-center">Loading…</div>
        ) : workers.length === 0 && !adding ? (
          <div className="px-5 py-6 text-sm text-slate-400 text-center">No workers yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {workers.map(w => (
              <div key={w.id} className="px-5 py-3">
                {editId === w.id ? (
                  <div className="flex flex-col gap-2">
                    <input className={inputCls} placeholder="Name" value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} />
                    <input className={inputCls} placeholder="Email" value={editData.email ?? ''} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} />
                    <input className={inputCls} placeholder="Google Calendar ID (e.g. user@gmail.com)" value={editData.google_calendar_id ?? ''} onChange={e => setEditData(p => ({ ...p, google_calendar_id: e.target.value }))} />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(w.id)} disabled={saving} className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setEditId(null)} className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{w.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {w.email ?? <span className="italic">No email</span>}
                        {w.google_calendar_id && <span className="ml-2 text-slate-300">· {w.google_calendar_id}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => { setEditId(w.id); setEditData({ name: w.name, email: w.email, google_calendar_id: w.google_calendar_id }); setError(''); }}
                        className="h-7 px-2.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteWorker(w.id)}
                        className="h-7 px-2.5 rounded-md border border-slate-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {adding && (
              <form onSubmit={addWorker} className="px-5 py-4 flex flex-col gap-2 bg-slate-50">
                <div className="text-xs font-semibold text-slate-600 mb-1">New worker</div>
                <input required className={inputCls} placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
                <input className={inputCls} placeholder="Email (optional)" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                <input className={inputCls} placeholder="Google Calendar ID (optional)" value={newCal} onChange={e => setNewCal(e.target.value)} />
                <div className="flex gap-2 mt-1">
                  <button type="submit" disabled={saving} className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving ? 'Adding…' : 'Add worker'}
                  </button>
                  <button type="button" onClick={() => setAdding(false)} className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        {error && <div className="px-5 py-2 text-sm text-red-600 bg-red-50 border-t border-red-100">{error}</div>}
      </div>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Current plan</h2>
        <p className="text-sm text-slate-500 mb-4">Manage your subscription and payment method.</p>
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">Free plan</div>
            <div className="text-xs text-slate-500 mt-0.5">Upgrade to unlock more features.</div>
          </div>
          <a
            href="/pricing"
            className="h-8 px-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 inline-flex items-center transition-colors"
          >
            Upgrade
          </a>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Billing portal</h2>
        <p className="text-sm text-slate-500 mb-4">View invoices, update payment method, or cancel your subscription.</p>
        <form method="POST" action="/api/stripe/portal">
          <button
            type="submit"
            className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Open billing portal →
          </button>
        </form>
      </div>
    </div>
  );
}
