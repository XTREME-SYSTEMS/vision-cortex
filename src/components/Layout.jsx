import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Bot, MessagesSquare, Activity, Radar, Telescope, Users, EyeOff, LineChart, ListTodo, MessageCircle, Menu, BookOpen, FileCode, Workflow, FlaskConical, Rocket, Megaphone, ShieldCheck } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import InstallButton from '@/components/InstallButton';
import OwnerBell from '@/components/OwnerBell';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const nav = [
  { to: '/', label: 'Opportunities', icon: LayoutDashboard },
  { to: '/build', label: 'Build Studio', icon: Workflow },
  { to: '/simulation', label: 'Simulate', icon: FlaskConical },
  { to: '/approvals', label: 'Approvals', icon: Rocket },
  { to: '/marketer', label: 'Marketer', icon: Megaphone },
  { to: '/audit', label: 'Audit', icon: ShieldCheck },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/chat', label: 'War Room', icon: MessagesSquare },
  { to: '/intel', label: 'Intel', icon: Telescope },
  { to: '/ops', label: 'Ops & Healing', icon: Activity },
  { to: '/council', label: 'Council', icon: Users },
  { to: '/paper', label: 'Paper Desk', icon: LineChart },
  { to: '/queue', label: 'Queue', icon: ListTodo },
  { to: '/live', label: 'Live Chat', icon: MessageCircle },
  { to: '/playbook', label: 'Playbook', icon: BookOpen },
  { to: '/codebase', label: 'Codebase', icon: FileCode },
];

const adminNav = [
  { to: '/shadow', label: 'Shadow', icon: EyeOff },
];

export default function Layout() {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  const allNav = isAdmin ? [...nav, ...adminNav] : nav;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <span className="h-8 w-8 rounded-xl bg-foreground text-background grid place-items-center">
              <Radar className="w-4 h-4" />
            </span>
            <span className="font-display text-[15px] tracking-[0.18em] uppercase">Vision Cortex</span>
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
          <div className="ml-auto md:ml-0 flex items-center gap-2">
            <OwnerBell />
            <InstallButton className="hidden sm:inline-flex" />
            <ThemeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                  <SheetTitle className="font-display tracking-[0.18em] uppercase text-sm">Vision Cortex</SheetTitle>
                </SheetHeader>
                <nav className="px-3 py-4 space-y-1 overflow-y-auto" onClick={() => setOpen(false)}>
                  {allNav.map(({ to, label, icon: Icon }) => {
                    const active = pathname === to;
                    return (
                      <Link
                        key={to}
                        to={to}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                          active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4" /> {label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="p-4 border-t border-border/60">
                  <InstallButton className="w-full" />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-10">
        <Outlet />
      </main>
    </div>
  );
}