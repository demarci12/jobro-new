'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  BookOpen,
  FileText,
  Receipt,
  Settings,
  LogOut,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar',  label: 'Calendar',  icon: Calendar },
  { href: '/contacts',  label: 'Clients',   icon: Users },
  { href: '/bookings',  label: 'Bookings',  icon: BookOpen },
  { href: '/quotes',    label: 'Quotes',    icon: FileText },
  { href: '/invoices',  label: 'Invoices',  icon: Receipt },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-200">
        <Link href="/calendar" className="flex items-center gap-2.5 no-underline">
          <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-base font-black">
            J
          </span>
          <span className="text-[17px] font-extrabold tracking-tight text-slate-900">Jobro</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== '/calendar' && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors no-underline',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: settings + user */}
      <div className="px-2 py-3 border-t border-slate-200 flex flex-col gap-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors no-underline',
            path.startsWith('/settings')
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors w-full text-left">
              <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                U
              </span>
              <span className="flex-1 truncate">Account</span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form method="POST" action="/api/auth/signout">
                <button type="submit" className="flex items-center gap-2 w-full text-red-600">
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
