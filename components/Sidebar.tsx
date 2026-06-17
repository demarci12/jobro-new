'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: <DashIcon /> },
  { href: '/calendar',  label: 'Calendar',  icon: <CalIcon /> },
  { href: '/contacts',  label: 'Clients',   icon: <PeopleIcon /> },
  { href: '/bookings',  label: 'Bookings',  icon: <BookIcon /> },
  { href: '/quotes',    label: 'Quotes',    icon: <QuoteIcon /> },
  { href: '/invoices',  label: 'Invoices',  icon: <InvoiceIcon /> },
  { href: '/settings',  label: 'Settings',  icon: <GearIcon /> },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside style={{
      width: 'var(--sidebar-w)', flexShrink: 0, background: 'var(--paper)',
      borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--line)' }}>
        <Link href="/calendar" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', color:'var(--ink)' }}>
          <span style={{
            width:32, height:32, background:'var(--blue)', color:'#fff',
            borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:16, fontWeight:900,
          }}>J</span>
          <span style={{ fontSize:17, fontWeight:800, letterSpacing:'-0.02em' }}>Jobro</span>
        </Link>
      </div>
      <nav style={{ flex:1, padding:'12px 8px', display:'flex', flexDirection:'column', gap:2 }}>
        {NAV.map(({ href, label, icon }) => {
          const active = path === href || (href !== '/calendar' && path.startsWith(href));
          return (
            <Link key={href} href={href} style={{
              display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
              borderRadius:7, textDecoration:'none', fontSize:14, fontWeight: active ? 600 : 500,
              color: active ? 'var(--blue)' : 'var(--ink)',
              background: active ? 'var(--blue-light)' : 'transparent',
              transition:'background 0.1s, color 0.1s',
            }}>
              {icon}
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function DashIcon()  { return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>; }
function CalIcon()   { return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="16" height="15" rx="2"/><path d="M2 8h16M6 2v2M14 2v2"/></svg>; }
function PeopleIcon(){ return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="7" r="3"/><path d="M2 17c0-3.314 2.686-5 6-5s6 1.686 6 5"/><path d="M14 7c1.657 0 3 1.343 3 3M17 17c0-2-1-3.5-3-4"/></svg>; }
function BookIcon()  { return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h12v14H4zM8 4V2M12 4V2"/><path d="M7 9h6M7 13h4"/></svg>; }
function QuoteIcon() { return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h0a2 2 0 002-2M9 5a2 2 0 012-2h0a2 2 0 012 2"/></svg>; }
function InvoiceIcon(){ return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 3h10a1 1 0 011 1v13l-3-2-3 2-3-2-3 2V4a1 1 0 011-1z"/><path d="M7 8h6M7 11h4"/></svg>; }
function GearIcon()  { return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"/></svg>; }
