import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Bot, MessagesSquare, Activity, Radar, Telescope, Users, EyeOff } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { base44 } from '@/api/base44Client';

const nav = [
  { to: '/', label: 'Opportunities', icon: LayoutDashboard },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/chat', label: 'War Room', icon: MessagesSquare },
  { to: '/intel', label: 'Intel', icon: Telescope },
  { to: '/ops', label: 'Ops & Healing', icon: Activity },
  { to: '/council', label: 'Council', icon: Users },
];

const adminNav = [
  { to: '/shadow', label: 'Shadow', icon: EyeOff },
];

export default function Layout() {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  const allNav = isAdmin ? [...nav, ...adminNav] : nav;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-xl bg-foreground text-background grid place-items-center">
              <Radar className="w-4 h-4" />
            </span>
            <span className="font-display text-[15px] tracking-[0.18em] uppercase">Xtreme Vision</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-auto">
            {allNav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3.5 py-2 rounded-full text-[13px] flex items-center gap-2 transition-colors ${
                    active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto md:ml-0"><ThemeToggle /></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-10 pb-28 md:pb-16">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${allNav.length}, minmax(0, 1fr))` }}>
          {allNav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link key={to} to={to} className={`py-3 flex flex-col items-center gap-1 text-[10px] tracking-wide ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}