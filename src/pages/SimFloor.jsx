import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import AgentNode from '@/components/sims/AgentNode';
import ActivityTicker from '@/components/sims/ActivityTicker';
import SimStats from '@/components/sims/SimStats';
import AgentDetailPanel from '@/components/sims/AgentDetailPanel';

const CLUSTERS = {
  command: { x: 50, y: 14, label: 'COMMAND', color: '#6366f1' },
  intelligence: { x: 16, y: 42, label: 'INTELLIGENCE', color: '#0ea5e9' },
  build: { x: 84, y: 42, label: 'BUILD STUDIO', color: '#f59e0b' },
  operations: { x: 30, y: 72, label: 'OPERATIONS', color: '#10b981' },
  comms: { x: 50, y: 90, label: 'COMMS', color: '#ec4899' },
  strategy: { x: 70, y: 72, label: 'STRATEGY', color: '#8b5cf6' },
};

function categorizeAgent(agent) {
  const name = (agent.name || '').toLowerCase();
  const role = (agent.role || '').toLowerCase();
  const caps = (agent.capabilities || []).join(' ').toLowerCase();
  if (name.includes('prime') || name.includes('keeper') || name.includes('philosopher') || role.includes('orchestrat')) return 'command';
  if (name.includes('vision') || name.includes('sage') || name.includes('validator') || name.includes('scout') || role.includes('intel') || caps.includes('scrap') || caps.includes('research')) return 'intelligence';
  if (name.includes('builder') || name.includes('maxwell') || name.includes('autonomous') || role.includes('build') || caps.includes('deploy') || caps.includes('provision')) return 'build';
  if (name.includes('eden') || name.includes('brand') || name.includes('distributor') || name.includes('coach') || role.includes('comm') || caps.includes('email') || caps.includes('outreach')) return 'comms';
  if (name.includes('strateg') || name.includes('quant') || name.includes('treasurer') || name.includes('capital') || role.includes('financ') || caps.includes('trade')) return 'strategy';
  return 'operations';
}

export default function SimFloor() {
  const [agents, setAgents] = useState(null);
  const [logs, setLogs] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [timeclock, setTimeclock] = useState([]);
  const [ripples, setRipples] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    const [a, l, s, tc] = await Promise.all([
      base44.entities.AgentProfile.list('order', 50).catch(() => []),
      base44.entities.AgentLog.list('-created_date', 40).catch(() => []),
      base44.entities.AgentSchedule.filter({ status: 'in_progress' }, '-created_date', 50).catch(() => []),
      base44.entities.TimeClockEntry.filter({ status: 'active' }, '-created_date', 50).catch(() => []),
    ]);
    setAgents(a || []);
    setLogs(l || []);
    setSchedules(s || []);
    setTimeclock(tc || []);
  }, []);

  useEffect(() => {
    loadData();
    const u1 = base44.entities.AgentLog.subscribe((event) => {
      loadData();
      if (event.type === 'create' && event.data?.agent_name) {
        const id = Date.now() + Math.random();
        setRipples((r) => [...r.slice(-8), { id, agentName: event.data.agent_name, level: event.data.level, ts: Date.now() }]);
        setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 2500);
      }
    });
    const u2 = base44.entities.AgentSchedule.subscribe(() => loadData());
    const u3 = base44.entities.TimeClockEntry.subscribe(() => loadData());
    const u4 = base44.entities.AgentProfile.subscribe(() => loadData());
    return () => { u1(); u2(); u3(); u4(); };
  }, [loadData]);

  const positionedAgents = useMemo(() => {
    if (!agents) return [];
    const clusters = {};
    agents.forEach((agent) => {
      const cat = categorizeAgent(agent);
      if (!clusters[cat]) clusters[cat] = [];
      clusters[cat].push(agent);
    });
    const result = [];
    Object.entries(clusters).forEach(([cat, list]) => {
      const center = CLUSTERS[cat];
      if (!center) return;
      list.forEach((agent, i) => {
        const count = list.length;
        if (count === 1) {
          result.push({ ...agent, _cat: cat, _x: center.x, _y: center.y, _color: center.color });
        } else {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
          const radius = Math.min(7, 3 + count * 0.8);
          result.push({ ...agent, _cat: cat, _x: center.x + Math.cos(angle) * radius, _y: center.y + Math.sin(angle) * radius, _color: center.color });
        }
      });
    });
    return result;
  }, [agents]);

  const agentPositions = useMemo(() => {
    const map = {};
    positionedAgents.forEach((a) => { map[a.name] = { x: a._x, y: a._y }; });
    return map;
  }, [positionedAgents]);

  const activeAgentNames = useMemo(() => {
    const names = new Set();
    timeclock.forEach((t) => t.agent_name && names.add(t.agent_name));
    schedules.forEach((s) => s.agent_name && names.add(s.agent_name));
    return names;
  }, [timeclock, schedules]);

  const agentTasks = useMemo(() => {
    const tasks = {};
    schedules.forEach((s) => { if (s.agent_name) tasks[s.agent_name] = s.task_title; });
    timeclock.forEach((t) => { if (t.agent_name && !tasks[t.agent_name]) tasks[t.agent_name] = t.task_type; });
    return tasks;
  }, [schedules, timeclock]);

  const agentLogs = useMemo(() => {
    const map = {};
    (logs || []).forEach((l) => {
      if (!l.agent_name) return;
      if (!map[l.agent_name]) map[l.agent_name] = [];
      map[l.agent_name].push(l);
    });
    return map;
  }, [logs]);

  const selectedAgent = selectedId ? positionedAgents.find((a) => a.id === selectedId) : null;

  const stats = useMemo(() => {
    if (!agents) return { active: 0, total: 0, tasks: 0, inf: 0 };
    return {
      active: agents.filter((a) => a.status === 'active').length,
      total: agents.length,
      tasks: agents.reduce((s, a) => s + (a.tasks_completed || 0), 0),
      inf: agents.reduce((s, a) => s + (a.inf_balance || 0), 0),
    };
  }, [agents]);

  if (!agents || !logs) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
          <p className="mt-3 text-sm text-slate-400">Initializing ops floor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      <SimStats stats={stats} activeSchedules={schedules.length} />

      <div
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      >
        {/* Cluster zones */}
        {Object.entries(CLUSTERS).map(([key, c]) => (
          <div
            key={key}
            className="absolute rounded-2xl border border-white/5 pointer-events-none"
            style={{
              left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%, -50%)',
              width: '180px', height: '140px',
              background: `radial-gradient(circle, ${c.color}08 0%, transparent 70%)`,
            }}
          >
            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-[0.2em] text-white/25">{c.label}</span>
          </div>
        ))}

        {/* Connection lines within clusters */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {Object.entries(
            positionedAgents.reduce((acc, a) => {
              if (!acc[a._cat]) acc[a._cat] = [];
              acc[a._cat].push(a);
              return acc;
            }, {})
          ).map(([cat, list]) => {
            if (list.length < 2) return null;
            return list.slice(1).map((a, i) => {
              const prev = list[i];
              return (
                <line
                  key={`${prev.id}-${a.id}`}
                  x1={`${prev._x}%`} y1={`${prev._y}%`}
                  x2={`${a._x}%`} y2={`${a._y}%`}
                  stroke={a._color} strokeWidth="1" strokeOpacity="0.12"
                />
              );
            });
          })}
        </svg>

        {/* Agent nodes */}
        {positionedAgents.map((agent) => (
          <AgentNode
            key={agent.id}
            agent={agent}
            active={activeAgentNames.has(agent.name)}
            task={agentTasks[agent.name]}
            isSelected={selectedId === agent.id}
            onClick={() => setSelectedId(agent.id)}
          />
        ))}

        {/* Ripples */}
        <AnimatePresence>
          {ripples.map((r) => {
            const pos = agentPositions[r.agentName];
            if (!pos) return null;
            const color = r.level === 'error' ? '#ef4444' : r.level === 'warn' ? '#f59e0b' : r.level === 'success' ? '#10b981' : '#0ea5e9';
            return (
              <motion.div
                key={r.id}
                className="absolute rounded-full pointer-events-none"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', border: `2px solid ${color}` }}
                initial={{ width: 40, height: 40, opacity: 0.8 }}
                animate={{ width: 160, height: 160, opacity: 0 }}
                transition={{ duration: 2, ease: 'easeOut' }}
              />
            );
          })}
        </AnimatePresence>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedAgent && (
            <AgentDetailPanel
              agent={selectedAgent}
              task={agentTasks[selectedAgent.name]}
              logs={agentLogs[selectedAgent.name] || []}
              now={now}
              onClose={() => setSelectedId(null)}
            />
          )}
        </AnimatePresence>
      </div>

      <ActivityTicker logs={logs} now={now} />
    </div>
  );
}