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
        <button disabled style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', height: 48, fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
          color: 'var(--muted)', background: 'var(--canvas)', border: '1px solid var(--line)',
          borderRadius: 10, cursor: 'not-allowed', opacity: 0.5,
        }}>
          Sign-in temporarily unavailable
        </button>
        <p style={{ marginTop: 24, fontSize: 13 }}><a href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Back to homepage</a></p>
      </div>
    </div>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return <LoginContent searchParams={sp} />;
}
