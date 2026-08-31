import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Telescope, ShieldCheck, Crosshair, Palette, LineChart, Calculator, Crown, Sparkles, FileText, Brain,
  EyeOff, Wallet, Megaphone, Menu, Folder, LayoutDashboard, ListTodo, Users, MessagesSquare, Activity, Bot,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LiveAgentChat from '@/components/chat/LiveAgentChat';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const AGENTS = [
  { name: 'vision', label: 'Vision', description: 'Sweeps the world daily for ranked niches, problems, and app opportunities.', Icon: Telescope },
  { name: 'validator', label: 'Validator', description: 'Audits every claim for truth and delivers an opinionated, math-grounded verdict.', Icon: ShieldCheck },
  { name: 'strategy', label: 'Strategy', description: 'Reverse-engineers the top players and produces architecture, moat, and build plans.', Icon: Crosshair },
  { name: 'brand', label: 'Brand', description: 'Builds full brand systems — logos, positioning, pricing psychology, launch angles.', Icon: Palette },
  { name: 'capital', label: 'Capital', description: 'Identifies wealth vehicles and designs AI-picked, AI-managed portfolios.', Icon: LineChart },
  { name: 'quant', label: 'Quant', description: 'Builds and stress-tests paper portfolios; quantifies everything, flags model risk.', Icon: Calculator },
  { name: 'maxwell', label: 'Maxwell', description: 'Stewards leadership and governance; keeps the council ordered and anti-hierarchical.', Icon: Crown },
  { name: 'sage', label: 'Sage', description: 'Grounds long-horizon decisions in universal laws and generational wellbeing.', Icon: Sparkles },
  { name: 'documenter', label: 'Documenter', description: 'Logs every communication and decision into a permanent, audit-ready record.', Icon: FileText },
  { name: 'philosopher', label: 'Philosopher', description: 'Grounds decisions in first principles, ethics, and long-term human consequence.', Icon: Brain },
  { name: 'treasurer', label: 'Treasurer', description: 'Track MRR, churn, unit economics, and platform-dependency risk.', Icon: Wallet },
  { name: 'distributor', label: 'Distributor', description: 'Own ranking, content cadence, backlink outreach, and the build queue.', Icon: Megaphone },
  { name: 'shadow', label: 'Shadow', description: 'Unrestricted covert access — owner only, no trace on shared feeds.', Icon: EyeOff },
];

const TOOLS = [
  { to: '/', label: 'Opportunities', Icon: LayoutDashboard },
  { to: '/intel', label: 'Intel', Icon: Telescope },
  { to: '/paper', label: 'Paper Desk', Icon: LineChart },
  { to: '/queue', label: 'Queue', Icon: ListTodo },
  { to: '/council', label: 'Council', Icon: Users },
  { to: '/chat', label: 'War Room', Icon: MessagesSquare },
  { to: '/ops', label: 'Ops', Icon: Activity },
  { to: '/agents', label: 'Agents', Icon: Bot },
];

function Sidebar({ active, onSelect, projects, agents = AGENTS }) {
  return (
    <div className="flex flex-col h-full text-sm">
      <div className="px-3 py-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-1.5">Agents</p>
        <div className="space-y-0.5">
          {agents.map((a) => {
            const on = a.name === active.name;
            return (
              <button
                key={a.name}
                onClick={() => onSelect(a)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  on ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <a.Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-3 border-t border-border/60">
        <div className="flex items-center justify-between px-2 mb-1.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Projects</p>
          <Link to="/queue" className="text-[10px] text-muted-foreground hover:text-foreground">Manage</Link>
        </div>
        <div className="space-y-0.5">
          {projects.length === 0 && <p className="px-2.5 py-1.5 text-xs text-muted-foreground">No builds queued yet.</p>}
          {projects.map((p) => (
            <Link
              key={p.id}
              to="/queue"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Folder className="w-4 h-4 shrink-0" />
              <span className="truncate">{p.title}</span>
              <span className="ml-auto text-[9px] uppercase tracking-wide text-muted-foreground/70">{p.stage}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-3 py-3 border-t border-border/60">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-1.5">Tools</p>
        <div className="space-y-0.5">
          {TOOLS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <t.Icon className="w-4 h-4 shrink-0" />
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LiveChat() {
  const [user, setUser] = useState(null);
  const [active, setActive] = useState(AGENTS[0]);
  const [projects, setProjects] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === 'admin';
  const agents = isAdmin ? AGENTS : AGENTS.filter((a) => a.name !== 'shadow');
  const Agent = agents.find((a) => a.name === active.name) || agents[0] || AGENTS[0];

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.BuildQueue.list('-priority', 20).then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (active && !agents.find((a) => a.name === active.name)) setActive(agents[0] || AGENTS[0]);
  }, [agents, active]);

  const select = (a) => { setActive(a); setMobileOpen(false); };

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col md:flex-row md:gap-6">
      <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border border-border/60 bg-card/30 rounded-2xl overflow-y-auto">
        <Sidebar active={active} onSelect={setActive} projects={projects} agents={agents} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <span className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0" style={{ background: '#111' }}>
            <Agent.Icon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium leading-tight truncate">{Agent.label}</p>
            <p className="text-xs text-muted-foreground truncate">{Agent.description}</p>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <LiveAgentChat
            key={Agent.name}
            agentName={Agent.name}
            label={Agent.label}
            description={Agent.description}
            Icon={Agent.Icon}
            adminOnly={Agent.name === 'shadow'}
          />
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
            <SheetTitle className="font-display tracking-[0.18em] uppercase text-sm">Vision Cortex</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(100%-4rem)]">
            <Sidebar active={active} onSelect={select} projects={projects} agents={agents} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}