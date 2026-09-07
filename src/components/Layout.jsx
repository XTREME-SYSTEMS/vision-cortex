import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Radar, ChevronLeft, X, Bot, Menu,
  LayoutDashboard, Sparkles, FlaskConical, Users,
  Dna, ShieldAlert, Gauge, History, Trophy, Target,
  ListChecks, ShieldCheck, ScanLine, Telescope,
  Workflow, Rocket, Megaphone, Globe,
  Cpu, Factory, Brain,
  MessagesSquare, MessageCircle, Activity, LineChart, ListTodo, BookOpen, FileCode,
  EyeOff, Server, Lock, Zap, Building2, Network, Settings,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import InstallButton from '@/components/InstallButton';
import OwnerBell from '@/components/OwnerBell';
import StatusCenter from '@/components/StatusCenter';
import AgentRow from '@/components/AgentRow';
import SidebarActions from '@/components/sidebar/SidebarActions';
import NavGroup from '@/components/sidebar/NavGroup';
import AgentsCard from '@/components/sidebar/AgentsCard';
import UniversalChat from '@/components/chat/UniversalChat';
import ProjectFolders from '@/components/sidebar/ProjectFolders';
import { base44 } from '@/api/base44Client';

const navGroups = [
  {
    label: 'Core',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { to: '/blueprint', label: 'Blueprint', icon: BookOpen },
      { to: '/company', label: 'The Company', icon: Building2 },
      { to: '/sim', label: 'Ops Floor', icon: Activity },
      { to: '/swarms', label: 'Swarms', icon: Network },
      { to: '/preflight', label: 'Pre-Flight', icon: Activity },
      { to: '/registry', label: 'System Registry', icon: ListChecks },
      { to: '/vision', label: 'Vision', icon: Radar },
      { to: '/', label: 'Opportunities', icon: LayoutDashboard },
      { to: '/destiny', label: 'Destiny Flow', icon: Sparkles },
      { to: '/lifelab', label: 'Life Lab', icon: FlaskConical },
      { to: '/usersim', label: 'User Sim', icon: Users },
      { to: '/settings', label: 'Agent Settings', icon: Settings },
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
      { to: '/fleet', label: 'Fleet Command', icon: Server },
      { to: '/scrape', label: 'Scrape Pipeline', icon: Globe },
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
      { to: '/clone-factory', label: 'Clone Factory', icon: Factory },
      { to: '/zero-credit', label: 'Zero-Credit Engine', icon: Zap },
      { to: '/autonomous-loop', label: 'Autonomous Loop', icon: Brain },
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
      { to: '/command', label: 'Command Center', icon: Radar },
      { to: '/vault', label: 'Vault', icon: Lock },
      { to: '/management', label: 'App Management', icon: Server },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeAgents, setActiveAgents] = useState(['Prime']);

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  // Close agents card and mobile menu when navigating
  useEffect(() => {
    setShowAgentsCard(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const toggleAgent = (name) =>
    setActiveAgents((a) => (a.includes(name) ? a.filter((n) => n !== name) : [...a, name]));

  // Auto-activate agent from query param (e.g. ?agent=Alpha-Inquisitor)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const agent = params.get('agent');
    if (agent && !activeAgents.includes(agent)) {
      setActiveAgents((a) => [...a, agent]);
    }
  }, [pathname]);

  const goHome = () => {
    setShowAgentsCard(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const isHome = pathname === '/' && !showAgentsCard;
  const pageTitle = pathname.startsWith('/folder/') ? 'Project Folder' : pathname.replace('/', '').replace(/-/g, ' ');

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      {/* Left sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border/60 flex-col bg-sidebar">
        <div className="px-3 py-3 border-b border-border/60">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-foreground text-background grid place-items-center">
              <Radar className="w-4 h-4" />
            </span>
            <span className="font-display text-[13px] tracking-[0.15em] uppercase">Vision Cortex</span>
            <span className="text-[9px] font-mono text-muted-foreground/60 tracking-wider">V-1</span>
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
          <ProjectFolders />
        </nav>

        {/* Footer — special action buttons */}
        <div className="px-2 py-2 border-t border-border/60">
          <SidebarActions />
        </div>
      </aside>

      {/* Main content — chat primary (ChatGPT-style), pages open in center */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar with hamburger */}
        <div className="md:hidden flex items-center justify-between gap-1 px-3 py-2 border-b border-border/60 bg-background">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" onClick={goHome} className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-foreground text-background grid place-items-center">
              <Radar className="w-3.5 h-3.5" />
            </span>
            <span className="font-display text-xs tracking-[0.15em] uppercase">Vision Cortex</span>
          </Link>
          <div className="flex items-center gap-1">
            <OwnerBell />
            <ThemeToggle />
          </div>
        </div>

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-end gap-1 px-3 py-1 border-b border-border/60 bg-background">
          <OwnerBell />
          <ThemeToggle />
        </div>
        <div className="hidden md:block"><StatusCenter /></div>
        <div className="hidden md:block"><AgentRow activeAgents={activeAgents} onToggleAgent={toggleAgent} /></div>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {/* Base layer: always chat */}
          <div className={cn('absolute inset-0', (!isHome || showAgentsCard) && 'md:hidden')}>
            <UniversalChat activeAgents={activeAgents} />
          </div>

          {/* Overlay: agents card or page — full-screen on mobile, in-flow on desktop */}
          {(showAgentsCard || !isHome) && (
            <div className="fixed inset-0 z-50 bg-background flex flex-col md:absolute md:inset-0 md:z-auto">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30 shrink-0">
                <button onClick={goHome} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium truncate px-2 capitalize">
                  {showAgentsCard ? 'Agent Selection' : pageTitle}
                </span>
                <button onClick={goHome} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {showAgentsCard ? (
                  <AgentsCard activeAgents={activeAgents} onToggleAgent={toggleAgent} onClose={goHome} />
                ) : (
                  <Outlet />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile menu drop-down */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[60]">
            <motion.div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="absolute left-0 right-0 top-0 bg-sidebar border-b border-border/60 flex flex-col max-h-[85vh]"
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="px-3 py-3 border-b border-border/60 flex items-center justify-between">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-lg bg-foreground text-background grid place-items-center">
                    <Radar className="w-4 h-4" />
                  </span>
                  <span className="font-display text-[13px] tracking-[0.15em] uppercase">Vision Cortex</span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-2 pt-2 pb-2 border-b border-border/60">
                <button
                  onClick={() => { setShowAgentsCard(true); setMobileMenuOpen(false); }}
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
              <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 no-scrollbar">
                {navGroups.map((g) => (
                  <NavGroup key={g.label} {...g} />
                ))}
                {isAdmin && <NavGroup {...adminNav} />}
                <ProjectFolders />
              </nav>
              <div className="px-2 py-2 border-t border-border/60">
                <SidebarActions />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}