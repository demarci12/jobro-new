import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const db = createAdminClient();
  const today = new Date();
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);

  const [
    { data: todayBookings },
    { data: inProgress },
    { data: pendingInvoices },
    { data: recentBookings },
  ] = await Promise.all([
    db.from('bookings')
      .select('id,start_time,end_time,status,contacts(name),workers(name),service_types(name)')
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .neq('status', 'CANCELLED')
      .order('start_time'),
    db.from('bookings')
      .select('id,contacts(name),workers(name)', { count: 'exact' })
      .eq('status', 'IN_PROGRESS'),
    db.from('invoices')
      .select('id,total,status,bookings(contacts(name))')
      .in('status', ['draft', 'sent'])
      .order('created_at', { ascending: false })
      .limit(5),
    db.from('bookings')
      .select('id,start_time,status,contacts(name),workers(name)')
      .order('start_time', { ascending: false })
      .limit(8),
  ]);

  const pendingTotal = (pendingInvoices ?? []).reduce((s: number, inv: any) => s + (inv.total ?? 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>
            {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/bookings/new" className="btn">+ New booking</Link>
          <Link href="/contacts/new" className="btn ghost">+ New client</Link>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Today's bookings" value={String(todayBookings?.length ?? 0)} href="/bookings" />
        <StatCard label="In progress" value={String(inProgress?.length ?? 0)} href="/bookings" accent={inProgress?.length ? '#f97316' : undefined} />
        <StatCard label="Unpaid invoices" value={String(pendingInvoices?.length ?? 0)} href="/invoices" accent={pendingInvoices?.length ? '#dc2626' : undefined} />
        <StatCard label="Revenue outstanding" value={`$${pendingTotal.toFixed(2)}`} href="/invoices" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Today's schedule */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Today's schedule</span>
            <Link href="/calendar" style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none' }}>Open calendar →</Link>
          </div>
          {!todayBookings?.length ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>No bookings today.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayBookings.map((b: any) => (
                <Link key={b.id} href={`/bookings/${b.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)',
                    background: 'var(--canvas)', transition: 'background 0.1s',
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)', width: 80, flexShrink: 0 }}>
                      {new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(b.contacts as any)?.name ?? '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{(b.workers as any)?.name ?? '—'} · {(b.service_types as any)?.name ?? 'Service'}</div>
                    </div>
                    <StatusDot status={b.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending invoices */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Pending invoices</span>
            <Link href="/invoices" style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none' }}>All invoices →</Link>
          </div>
          {!pendingInvoices?.length ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>No outstanding invoices.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingInvoices.map((inv: any) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)',
                    background: 'var(--canvas)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.bookings?.contacts?.name ?? '—'}</div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999, textTransform: 'capitalize',
                        background: inv.status === 'sent' ? '#eff6ff' : '#f5f5f5',
                        color: inv.status === 'sent' ? '#1d4ed8' : '#737373',
                      }}>{inv.status}</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>${parseFloat(inv.total ?? 0).toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, href, accent }: { label: string; value: string; href: string; accent?: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ cursor: 'pointer' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: accent ?? 'var(--ink)', letterSpacing: '-0.02em' }}>{value}</div>
      </div>
    </Link>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SCHEDULED: '#3b82f6', IN_PROGRESS: '#f97316', FINISHED: '#22c55e', CANCELLED: '#9ca3af',
  };
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[status] ?? '#9ca3af', flexShrink: 0 }} />;
}
