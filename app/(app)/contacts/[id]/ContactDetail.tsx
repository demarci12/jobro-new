'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ContactDetail({ contact, bookings, total }: { contact: any; bookings: any[]; total: number }) {
  const router = useRouter();
  const qMap: Record<string, [string, string]> = {
    draft: ['#f5f5f5', '#737373'], sent: ['#eff6ff', '#1d4ed8'], accepted: ['#f0fdf4', '#15803d'],
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/contacts" className="back">← Clients</Link>
          <h1 className="page-title">{contact.name}</h1>
        </div>
        <Link href={`/bookings/new?contact_id=${contact.id}`} className="btn">+ New booking</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 16, marginBottom: 32 }}>
        <div className="card">
          <div className="card-header">Contact details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contact.email && <Row label="Email"><a href={`mailto:${contact.email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{contact.email}</a></Row>}
            {contact.phone && <Row label="Phone"><a href={`tel:${contact.phone}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{contact.phone}</a></Row>}
            {contact.address && <Row label="Address"><span>{contact.address}</span></Row>}
            {!contact.email && !contact.phone && !contact.address && <span style={{ fontSize: 13, color: 'var(--muted)' }}>No details on file</span>}
          </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em' }}>{total}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Total bookings</div>
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Booking history</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Date & time</th><th>Worker</th><th>Service</th><th>Quote</th><th>Status</th></tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32, fontSize: 13 }}>No bookings yet</td></tr>
            ) : bookings.map((b: any) => {
              const q = b.quotes?.[0];
              const [qBg, qColor] = q ? (qMap[q.status] ?? qMap.draft) : ['', ''];
              return (
                <tr key={b.id} className="tr-link" onClick={() => router.push(`/bookings/${b.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{new Date(b.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{b.workers?.name ?? '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{b.service_types?.name ?? '—'}</td>
                  <td>{q ? <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: qBg, color: qColor, textTransform: 'capitalize' }}>{q.status}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td><span className={`badge badge-${b.status.toLowerCase().replace('_','-')}`}>{b.status.replace('_',' ')}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 14, alignItems: 'baseline' }}>
      <span style={{ color: 'var(--muted)', fontSize: 12, width: 56, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}
