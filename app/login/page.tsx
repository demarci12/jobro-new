import { Suspense } from 'react';

function LoginContent({ searchParams }: { searchParams: Record<string, string> }) {
  const error = searchParams.error;
  const next = searchParams.next ?? '/calendar';
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--canvas)' }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 800, textDecoration: 'none', color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 28 }}>
          <span style={{ width: 36, height: 36, background: '#2563eb', color: '#fff', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900 }}>J</span>
          Jobro
        </a>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Welcome back</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 28 }}>Sign in to manage bookings, clients, and workers.</p>
        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#b91c1c', marginBottom: 20, textAlign: 'left' }}>{error}</div>
        )}
        <form method="POST" action="/api/auth/signin">
          <input type="hidden" name="provider" value="google" />
          <input type="hidden" name="next" value={next} />
          <button type="submit" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', height: 48, fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
            color: 'var(--ink)', background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/>
              <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>
            </svg>
            Continue with Google
          </button>
        </form>
        <p style={{ marginTop: 24, fontSize: 13 }}><a href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Back to homepage</a></p>
      </div>
    </div>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return <LoginContent searchParams={sp} />;
}
