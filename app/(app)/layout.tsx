import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-slate-50 px-4 py-5 pt-[72px] pb-20 lg:px-8 lg:py-7 lg:pt-7 lg:pb-7 min-w-0">
        {children}
      </main>
    </div>
  );
}
