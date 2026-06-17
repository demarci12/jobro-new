import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{
        flex: 1, overflow: 'auto', padding: '28px 32px',
        background: 'var(--canvas)', minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  );
}
