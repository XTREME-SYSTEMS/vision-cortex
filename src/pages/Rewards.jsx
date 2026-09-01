import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trophy, Star, Zap, Brain, Activity, Award, Sparkles, Loader2, Crown, Medal, Gift } from 'lucide-react';

const AWARD_CONFIG = {
  proactive: { icon: Zap, label: 'Proactive Excellence', color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Did far more than asked or expected' },
  genius: { icon: Brain, label: 'Genius Award', color: 'text-violet-500', bg: 'bg-violet-500/10', desc: 'Identified high-impact systems, capabilities, or offered a major project' },
  most_active: { icon: Activity, label: 'Most Active', color: 'text-sky-500', bg: 'bg-sky-500/10', desc: 'Most tasks completed — proven in logs' },
  cracked: { icon: Crown, label: 'Cracked', color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Identified a fully AI-buildable, Stripe-linked, residual-income business' },
  weekly_top3: { icon: Medal, label: 'Top 3 Performer', color: 'text-orange-500', bg: 'bg-orange-500/10', desc: 'Weekly top 3 by score' },
  monthly_ceremony: { icon: Trophy, label: 'Monthly Ceremony', color: 'text-yellow-500', bg: 'bg-yellow-500/10', desc: 'End-of-month award ceremony' },
  achievement: { icon: Award, label: 'Achievement', color: 'text-rose-500', bg: 'bg-rose-500/10', desc: 'Letter of achievement earned' },
  bonus: { icon: Star, label: 'Bonus Points', color: 'text-slate-500', bg: 'bg-slate-500/10', desc: 'Proactivity bonus' },
};

export default function Rewards() {
  const [awards, setAwards] = useState(null);
  const [agents, setAgents] = useState(null);
  const [running, setRunning] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(null);

  const load = async () => {
    const [a, ag] = await Promise.all([
      base44.entities.AgentAward.list('-awarded_at', 200).catch(() => []),
      base44.entities.AgentProfile.list('order', 30).catch(() => []),
    ]);
    setAwards(a || []);
    setAgents(ag || []);
  };

  useEffect(() => { load(); }, []);

  // Leaderboard: aggregate bonus points per agent
  const leaderboard = useMemo(() => {
    if (!awards || !agents) return [];
    const points = {};
    awards.forEach((a) => {
      points[a.agent_name] = (points[a.agent_name] || 0) + (a.bonus_points || 0);
    });
    return agents
      .map((agent) => ({
        name: agent.name,
        codename: agent.codename,
        points: points[agent.name] || 0,
        tasks: agent.tasks_completed || 0,
        status: agent.status,
      }))
      .sort((a, b) => b.points - a.points);
  }, [awards, agents]);

  const runCeremony = async () => {
    setRunning(true);
    try {
      await base44.functions.invoke('monthlyAwardCeremony', {});
      load();
    } catch (e) {
      console.error(e);
    }
    setRunning(false);
  };

  const recentAwards = (awards || []).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Agent Rewards · Leaderboard & Ceremony</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">
          Recognition drives excellence.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Bonus points, weekly recognition, and monthly award ceremonies with digital letters of achievement.
        </p>
      </div>

      {/* Ceremony button */}
      <div className="flex items-center gap-3">
        <Button onClick={runCeremony} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
          {running ? 'Running Ceremony...' : 'Run Monthly Award Ceremony'}
        </Button>
        <span className="text-xs text-muted-foreground">Generates awards + digital letters for all agents</span>
      </div>

      {/* Leaderboard */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-500" />
          Leaderboard
        </h3>
        <Card className="p-4 border-border/60">
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No scores yet. Run the daily audit to start earning points.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((agent, i) => (
                <div key={i} className={cn('flex items-center gap-3 rounded-lg p-2.5',
                  i === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : i < 3 ? 'bg-muted/40' : '')}>
                  <span className={cn('w-6 text-center text-sm font-bold shrink-0',
                    i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-600' : 'text-muted-foreground')}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{agent.name}</span>
                    {agent.codename && <span className="text-xs text-muted-foreground ml-2">"{agent.codename}"</span>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{agent.tasks} tasks</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-sm font-bold tabular-nums">{agent.points}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Award categories */}
      <div>
        <h3 className="text-sm font-medium mb-3">Award Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(AWARD_CONFIG).filter(([k]) => k !== 'bonus').map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <Card key={key} className="p-4 border-border/60">
                <div className={cn('w-9 h-9 rounded-lg grid place-items-center mb-2', cfg.bg)}>
                  <Icon className={cn('w-4.5 h-4.5', cfg.color)} />
                </div>
                <p className="text-sm font-medium">{cfg.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{cfg.desc}</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent awards */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-rose-500" />
          Recent Awards
          <Badge variant="outline" className="text-[9px]">{awards?.length || 0}</Badge>
        </h3>
        {awards === null ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : recentAwards.length === 0 ? (
          <Card className="p-6 text-center border-border/60">
            <Sparkles className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No awards yet. Run the ceremony to recognize your agents.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentAwards.map((award) => {
              const cfg = AWARD_CONFIG[award.award_type] || AWARD_CONFIG.bonus;
              const Icon = cfg.icon;
              return (
                <Card key={award.id} className="p-3 border-border/60">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg grid place-items-center shrink-0', cfg.bg)}>
                      <Icon className={cn('w-4 h-4', cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{award.agent_name}</span>
                        <Badge variant="outline" className="text-[9px]">{cfg.label}</Badge>
                        <div className="flex items-center gap-1 ml-auto">
                          <Star className="w-3 h-3 text-amber-500" />
                          <span className="text-xs font-bold">+{award.bonus_points}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{award.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{award.reason}</p>
                    </div>
                    {award.letter_content && (
                      <Button size="sm" variant="ghost" onClick={() => setSelectedLetter(award)} className="shrink-0">
                        View Letter
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Letter modal */}
      {selectedLetter && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedLetter(null)}>
          <Card className="max-w-lg w-full p-8 bg-background max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-center border-b border-border/60 pb-4 mb-4">
              <Trophy className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Letter of Achievement</p>
              <h2 className="font-display text-2xl mt-1">{selectedLetter.agent_name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{selectedLetter.title}</p>
              {selectedLetter.ceremony_month && <p className="text-xs text-muted-foreground">{selectedLetter.ceremony_month}</p>}
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedLetter.letter_content}</p>
            </div>
            <div className="text-center mt-6 pt-4 border-t border-border/60">
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Vision Cortex · System DNA</p>
            </div>
            <Button className="w-full mt-4" onClick={() => setSelectedLetter(null)}>Close</Button>
          </Card>
        </div>
      )}
    </div>
  );
}