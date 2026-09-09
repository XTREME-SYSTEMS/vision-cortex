import { supabase } from '@/lib/supabase'
import { Activity, Bot, Database, MessageSquare, Zap, Globe } from 'lucide-react'

async function getStats() {
  try {
    const [ideas, agents, logs, messages, intel, pipelines] = await Promise.all([
      supabase.from('ideas').select('*', { count: 'exact', head: true }),
      supabase.from('agent_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('agent_logs').select('*', { count: 'exact', head: true }),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
      supabase.from('intel_feed').select('*', { count: 'exact', head: true }),
      supabase.from('vision_pipelines').select('*', { count: 'exact', head: true }),
    ])
    return {
      ideas: ideas.count || 0,
      agents: agents.count || 0,
      logs: logs.count || 0,
      messages: messages.count || 0,
      intel: intel.count || 0,
      pipelines: pipelines.count || 0,
    }
  } catch {
    return { ideas: 0, agents: 0, logs: 0, messages: 0, intel: 0, pipelines: 0 }
  }
}

export default async function DashboardPage() {
  const stats = await getStats()
  const cards = [
    { label: 'Ideas', value: stats.ideas, icon: Zap, color: 'text-yellow-500' },
    { label: 'Agents', value: stats.agents, icon: Bot, color: 'text-blue-500' },
    { label: 'Agent Logs', value: stats.logs, icon: Activity, color: 'text-green-500' },
    { label: 'Chat Messages', value: stats.messages, icon: MessageSquare, color: 'text-purple-500' },
    { label: 'Intel Items', value: stats.intel, icon: Globe, color: 'text-orange-500' },
    { label: 'Pipelines', value: stats.pipelines, icon: Database, color: 'text-cyan-500' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Vision Cortex — Autonomous AI Business Operating System</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-secondary/30 border border-border rounded-xl p-4">
            <card.icon className={`w-6 h-6 ${card.color} mb-2`} />
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-secondary/30 border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-2">System Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Supabase</span>
              <span className="text-green-500">● Connected</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI Gateway</span>
              <span className="text-green-500">● Active</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Railway Workers</span>
              <span className="text-green-500">● Running</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">GitHub</span>
              <span className="text-green-500">● Synced</span>
            </div>
          </div>
        </div>
        <div className="bg-secondary/30 border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-2">Quick Actions</h3>
          <div className="space-y-2">
            <a href="/chat" className="block text-sm text-primary hover:underline">→ Open AI Chat</a>
            <a href="/builder" className="block text-sm text-primary hover:underline">→ System Generator</a>
            <a href="/entities" className="block text-sm text-primary hover:underline">→ Manage Entities</a>
            <a href="/clone" className="block text-sm text-primary hover:underline">→ Clone Factory</a>
          </div>
        </div>
      </div>
    </div>
  )
}