import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export const revalidate = 30;

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
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/bookings/new" className="h-9 px-3 sm:px-4 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center">+ New booking</Link>
          <Link href="/contacts/new" className="hidden sm:inline-flex h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors items-center">+ New client</Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-7">
        <StatCard label="Today's bookings" value={String(todayBookings?.length ?? 0)} href="/bookings" />
        <StatCard label="In progress" value={String(inProgress?.length ?? 0)} href="/bookings" accent={inProgress?.length ? 'text-orange-500' : undefined} />
        <StatCard label="Unpaid invoices" value={String(pendingInvoices?.length ?? 0)} href="/invoices" accent={pendingInvoices?.length ? 'text-red-600' : undefined} />
        <StatCard label="Revenue outstanding" value={`$${pendingTotal.toFixed(2)}`} href="/invoices" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's schedule */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-900">Today&apos;s schedule</span>
            <Link href="/calendar" className="text-xs text-blue-600 hover:underline no-underline">Open calendar →</Link>
          </div>
          {!todayBookings?.length ? (
            <p className="text-sm text-slate-400">No bookings today.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {todayBookings.map((b: any) => (
                <Link key={b.id} href={`/bookings/${b.id}`} className="no-underline">
                  <div className="flex gap-3 items-center px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="text-xs text-slate-400 w-16 shrink-0">
                      {new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate text-slate-900">{(b.contacts as any)?.name ?? '—'}</div>
                      <div className="text-xs text-slate-400">{(b.workers as any)?.name ?? '—'} · {(b.service_types as any)?.name ?? 'Service'}</div>
                    </div>
                    <StatusDot status={b.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending invoices */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-900">Pending invoices</span>
            <Link href="/invoices" className="text-xs text-blue-600 hover:underline no-underline">All invoices →</Link>
          </div>
          {!pendingInvoices?.length ? (
            <p className="text-sm text-slate-400">No outstanding invoices.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingInvoices.map((inv: any) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="no-underline">
                  <div className="flex justify-between items-center px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{inv.bookings?.contacts?.name ?? '—'}</div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${inv.status === 'sent' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{inv.status}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">${parseFloat(inv.total ?? 0).toFixed(2)}</span>
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
    <Link href={href} className="no-underline">
      <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors cursor-pointer">
        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">{label}</div>
        <div className={`text-3xl font-extrabold tracking-tight ${accent ?? 'text-slate-900'}`}>{value}</div>
      </div>
    </Link>
  );
}

function StatusDot({ status }: { status: string }) {
  const cls: Record<string, string> = {
    SCHEDULED: 'bg-blue-500', IN_PROGRESS: 'bg-orange-500', FINISHED: 'bg-green-500', CANCELLED: 'bg-slate-300',
  };
  return <div className={`w-2 h-2 rounded-full shrink-0 ${cls[status] ?? 'bg-slate-300'}`} />;
}
