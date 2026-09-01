import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Bot, Play, Scan, Sparkles, Send, Activity } from 'lucide-react';
import { EnhancementQueue } from '@/components/autonomous/EnhancementQueue';

export default function AutonomousBuilder() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, implemented: 0, failed: 0 });
  const messagesEndRef = useRef(null);

  // ── Load conversations + stats ──
  useEffect(() => {
    loadConversations();
    loadStats();

    const unsub = base44.entities.SystemEnhancement.subscribe(() => {
      loadStats();
    });
    return unsub;
  }, []);

  // ── Subscribe to active conversation ──
  useEffect(() => {
    if (!activeConversation) return;
    const unsub = base44.agents.subscribeToConversation(activeConversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [activeConversation]);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: 'autonomous_builder' });
      setConversations(list || []);
    } catch (e) { console.error(e); }
  };

  const loadStats = async () => {
    try {
      const all = await base44.entities.SystemEnhancement.list('-created_date', 100);
      setStats({
        pending: all.filter(e => e.status === 'pending').length,
        in_progress: all.filter(e => e.status === 'in_progress' || e.status === 'validating').length,
        implemented: all.filter(e => e.status === 'implemented' || e.status === 'audited').length,
        failed: all.filter(e => e.status === 'failed' || e.status === 'blocked').length,
      });
    } catch (e) { console.error(e); }
  };

  const startNewConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'autonomous_builder',
        metadata: { name: 'New Session', description: 'Autonomous builder session' }
      });
      setActiveConversation(conv);
      setMessages([]);
      loadConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConversation) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      await base44.agents.addMessage(activeConversation, { role: 'user', content: input });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Quick actions ──
  const runAction = async (action) => {
    setActionLoading(action);
    try {
      const fnName = {
        scan: 'masterSystemAnalysis',
        recommend: 'autoRecommendAllSystems',
        enhance: 'autoEnhanceAll'
      }[action];
      await base44.functions.invoke(fnName, action === 'enhance' ? { max_per_run: 3 } : {});
      loadStats();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading">Autonomous Builder</h1>
            <p className="text-sm text-muted-foreground">24/7 self-improving code implementation engine</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => runAction('scan')} disabled={actionLoading === 'scan'}>
            {actionLoading === 'scan' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
            Scan Systems
          </Button>
          <Button variant="outline" size="sm" onClick={() => runAction('recommend')} disabled={actionLoading === 'recommend'}>
            {actionLoading === 'recommend' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Auto-Recommend
          </Button>
          <Button size="sm" onClick={() => runAction('enhance')} disabled={actionLoading === 'enhance'}>
            {actionLoading === 'enhance' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Implement Now
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Implemented', value: stats.implemented, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Failed', value: stats.failed, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s) => (
          <Card key={s.label} className={`${s.bg} border-0`}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Chat Panel */}
        <Card className="flex flex-col h-[600px]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Builder Chat
              {activeConversation && <Badge variant="secondary" className="text-xs">Active</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {!activeConversation ? (
              <div className="flex-1 flex items-center justify-center">
                <Button onClick={startNewConversation}>
                  <Bot className="w-4 h-4" />
                  Start New Conversation
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar mb-3">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Ask the Autonomous Builder to analyze, recommend, or implement enhancements.
                    </p>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask the builder to analyze, recommend, or implement..."
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={loading}
                  />
                  <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Enhancement Queue */}
        <EnhancementQueue onStatsUpdate={loadStats} />
      </div>

      {/* 24/7 Workflow Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            24/7 Autonomous Workflows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { name: 'Master System Analysis', schedule: 'Every 4 hours', action: 'Scans all systems for failures + gaps' },
              { name: 'Persistent Auto-Recommend', schedule: 'Every 12 hours', action: 'Generates new gaps with implementation code' },
              { name: 'Auto-Enhance Cycle', schedule: 'Daily at 2am', action: 'Implements top 3 pending enhancements' },
              { name: 'Continuous Auto-Enhance', schedule: 'Every 6 hours', action: 'Implements top 2 priority enhancements' },
            ].map((w) => (
              <div key={w.name} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{w.name}</p>
                  <Badge variant="secondary" className="text-xs">{w.schedule}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{w.action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}