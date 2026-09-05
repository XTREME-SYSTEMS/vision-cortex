import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Radar, ChevronLeft, X, Bot,
  LayoutDashboard, Sparkles, FlaskConical, Users,
  Dna, ShieldAlert, Gauge, History, Trophy, Target,
  ListChecks, ShieldCheck, ScanLine, Telescope,
  Workflow, Rocket, Megaphone, Globe,
  Cpu, Factory, Brain,
  MessagesSquare, MessageCircle, Activity, LineChart, ListTodo, BookOpen, FileCode,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import InstallButton from '@/components/InstallButton';
import OwnerBell from '@/components/OwnerBell';
import SystemDnaBar from '@/components/SystemDnaBar';
import NavGroup from '@/components/sidebar/NavGroup';
import AgentsCard from '@/components/sidebar/AgentsCard';
import UniversalChat from '@/components/chat/UniversalChat';
import { base44 } from '@/api/base44Client';

const navGroups = [
  {
    label: 'Core',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { to: '/', label: 'Opportunities', icon: LayoutDashboard },
      { to: '/destiny', label: 'Destiny Flow', icon: Sparkles },
      { to: '/lifelab', label: 'Life Lab', icon: FlaskConical },
      { to: '/usersim', label: 'User Sim', icon: Users },
    ],
  },
  {
    label: 'System DNA',
    icon: Dna,
    items: [
      { to: '/dna', label: 'System DNA', icon: Dna },
      { to: '/dna-audit', label: 'DNA Audit', icon: ShieldAlert },
      { to: '/performance', label: 'Performance', icon: Gauge },
      { to: '/dna-actions', label: 'DNA Actions', icon: History },
      { to: '/rewards', label: 'Rewards', icon: Trophy },
      { to: '/capabilities', label: 'Capabilities', icon: Target },
    ],
  },
  {
    label: 'Intelligence',
    icon: Telescope,
    items: [
      { to: '/gaps', label: 'Gaps', icon: ListChecks },
      { to: '/forensic', label: 'Forensic Audit', icon: ShieldCheck },
      { to: '/system-analyst', label: 'System Analyst', icon: ScanLine },
      { to: '/intel', label: 'Intel', icon: Telescope },
      { to: '/intelligence', label: 'Intelligence Seeker', icon: Brain },
    ],
  },
  {
    label: 'Build Studio',
    icon: Workflow,
    items: [
      { to: '/build', label: 'Build Studio', icon: Workflow },
      { to: '/simulation', label: 'Simulate', icon: FlaskConical },
      { to: '/approvals', label: 'Approvals', icon: Rocket },
      { to: '/marketer', label: 'Marketer', icon: Megaphone },
      { to: '/audit', label: 'Audit', icon: ShieldCheck },
      { to: '/site-monitor', label: 'Site Monitor', icon: Globe },
    ],
  },
  {
    label: 'Xtreme',
    icon: Cpu,
    items: [
      { to: '/xtreme-ai', label: 'Xtreme AI', icon: Cpu },
      { to: '/xtreme-factory', label: 'Factory Blueprint', icon: Factory },
      { to: '/xtreme-perfection', label: 'Xtreme Perfection', icon: Brain },
    ],
  },
  {
    label: 'Agents & Comms',
    icon: MessagesSquare,
    items: [
      { to: '/agents', label: 'Agents', icon: Bot },
      { to: '/chat', label: 'War Room', icon: MessagesSquare },
      { to: '/council', label: 'Council', icon: Users },
      { to: '/live', label: 'Live Chat', icon: MessageCircle },
      { to: '/ops', label: 'Ops & Healing', icon: Activity },
      { to: '/paper', label: 'Paper Desk', icon: LineChart },
      { to: '/queue', label: 'Queue', icon: ListTodo },
      { to: '/playbook', label: 'Playbook', icon: BookOpen },
      { to: '/codebase', label: 'Codebase', icon: FileCode },
    ],
  },
];

const adminNav = {
  label: 'Admin',
  icon: EyeOff,
  items: [
    { to: '/factory', label: 'Factory', icon: Factory },
    { to: '/autonomous', label: 'Autonomous', icon: Bot },
    { to: '/shadow', label: 'Shadow', icon: EyeOff },
  ],
};

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAgentsCard, setShowAgentsCard] = useState(false);
  const [activeAgents, setActiveAgents] = useState([]);

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  // Close agents card when navigating via sidebar
  useEffect(() => {
    setShowAgentsCard(false);
  }, [pathname]);

  const toggleAgent = (name) =>
    setActiveAgents((a) => (a.includes(name) ? a.filter((n) => n !== name) : [...a, name]));

  const goHome = () => {
    setShowAgentsCard(false);
    navigate('/');
  };

  const isHome = pathname === '/' && !showAgentsCard;

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      {/* Left sidebar */}
      <aside className="w-56 shrink-0 border-r border-border/60 flex flex-col bg-sidebar">
        <div className="px-3 py-3 border-b border-border/60">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-foreground text-background grid place-items-center">
              <Radar className="w-4 h-4" />
            </span>
            <span className="font-display text-[13px] tracking-[0.15em] uppercase">Vision Cortex</span>
          </Link>
        </div>

        {/* Chat Agents button */}
        <div className="px-2 pt-2 pb-2 border-b border-border/60">
          <button
            onClick={() => setShowAgentsCard(true)}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors',
              showAgentsCard ? 'bg-foreground text-background' : 'hover:bg-muted text-foreground'
            )}
          >
            <Bot className="w-4 h-4" />
            <span className="flex-1 text-left">Chat Agents</span>
            {activeAgents.length > 0 && (
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', showAgentsCard ? 'bg-background/20' : 'bg-foreground text-background')}>
                {activeAgents.length}
              </span>
            )}
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 no-scrollbar">
          {navGroups.map((g) => (
            <NavGroup key={g.label} {...g} />
          ))}
          {isAdmin && <NavGroup {...adminNav} />}
        </nav>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-border/60 flex items-center gap-1">
          <OwnerBell />
          <div className="ml-auto flex items-center gap-1">
            <InstallButton className="hidden" />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main content + chat */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <SystemDnaBar />

        {/* Content card — top 2/3 */}
        <div className="flex-[2] min-h-0 overflow-hidden p-3 sm:p-4">
          <div className="h-full rounded-xl border border-border/60 bg-card shadow-sm flex flex-col overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
              <button
                onClick={goHome}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium truncate px-2">
                {showAgentsCard ? 'Agent Selection' : isHome ? 'Home' : pathname.replace('/', '')}
              </span>
              <button
                onClick={goHome}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Card body */}
            <div className="flex-1 overflow-y-auto">
              {showAgentsCard ? (
                <AgentsCard activeAgents={activeAgents} onToggleAgent={toggleAgent} onClose={goHome} />
              ) : (
                <Outlet />
              )}
            </div>
          </div>
        </div>

        {/* Chat — bottom 1/3 */}
        <div className="flex-[1] min-h-0 border-t border-border/60">
          <UniversalChat activeAgents={activeAgents} />
        </div>
      </main>
    </div>
  );
}