'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Tab = 'general' | 'security' | 'integrations' | 'billing';

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

      <div className="mt-6 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-1">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6"/></svg>
          <h2 className="text-sm font-semibold text-slate-900">Workers</h2>
        </div>
        <p className="text-sm text-slate-500 mb-3">Workers are managed directly in your Supabase database.</p>
        <a
          href="https://supabase.com/dashboard/project/vgisqgawcltaslbzwzqj/editor"
          target="_blank"
          className="h-8 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 inline-flex items-center transition-colors"
        >
          Open Supabase table editor ↗
        </a>
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
