import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export default async function SettingsPage() {
  const supabase = createAdminClient();
  const { data: token } = await supabase.from('oauth_tokens').select('status, expires_at').eq('provider', 'google').maybeSingle();
  const connected = token?.status === 'active';
  const revoked = token?.status === 'revoked';

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 28 }}>Settings</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>

        <div className="card">
          <div className="card-header">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="16" height="15" rx="2"/><path d="M2 8h16M6 2v2M14 2v2"/></svg>
            Google Calendar
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 20 }}>
            Connect your Google account so bookings automatically appear on worker calendars.
          </p>
          <div style={{ padding: '12px 14px', background: 'var(--canvas)', border: '1px solid var(--line)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: connected ? '#22c55e' : revoked ? '#ef4444' : '#d1d5db' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{connected ? 'Connected' : revoked ? 'Disconnected' : 'Not connected'}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {connected ? `Token expires ${new Date(token!.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}` :
                 revoked ? 'Token revoked — bookings are not syncing.' :
                 'Connect to sync bookings to worker calendars.'}
              </div>
            </div>
            <a href="/api/auth/google" className={`btn${connected ? ' ghost' : ''} small`}>
              {connected ? 'Reconnect' : 'Connect →'}
            </a>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6"/></svg>
            Workers
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 16 }}>
            Workers are managed directly in your Supabase database. Each worker needs a name, email, and Google Calendar ID.
          </p>
          <a href="https://supabase.com/dashboard/project/vgisqgawcltaslbzwzqj/editor" target="_blank" className="btn ghost small">Open Supabase table editor ↗</a>
        </div>
      </div>
    </div>
  );
}
