'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { FileCode, Database, Zap, Settings, MessageSquare, Rocket, ChevronLeft, Plus, MoreVertical, Layers, GitBranch, Search } from 'lucide-react'
import Link from 'next/link'

const navItems = [
  { id: 'pages' as const, label: 'Pages', icon: FileCode },
  { id: 'entities' as const, label: 'Entities', icon: Database },
  { id: 'functions' as const, label: 'Functions', icon: Zap },
  { id: 'chat' as const, label: 'AI Chat', icon: MessageSquare },
  { id: 'deploy' as const, label: 'Deploy', icon: Rocket },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
]

export default function AppBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentApp, setApp, currentView, setView } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('ideas').select('*').eq('id', id).single()
        setApp(data)
      } catch {} finally { setLoading(false) }
    })()
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-screen text-zinc-500">Loading app...</div>
  if (!currentApp) return <div className="flex items-center justify-center h-screen text-zinc-500">App not found</div>

  return (
    <div className="flex h-screen">
      {/* Left Sidebar — App Navigation */}
      <aside className={`${sidebarCollapsed ? 'w-14' : 'w-56'} flex flex-col bg-zinc-950 border-r border-zinc-800 transition-all`}>
        <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
          <Link href="/" className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {currentApp.title?.[0]?.toUpperCase() || 'A'}
            </div>
            {!sidebarCollapsed && (
              <span className="text-sm font-medium truncate">{currentApp.title}</span>
            )}
          </Link>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-zinc-500 hover:text-white">
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 py-2">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                currentView === item.id ? 'bg-indigo-600/10 text-indigo-400 border-r-2 border-indigo-600' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div className="p-3 border-t border-zinc-800 text-xs text-zinc-600">
            <div className="flex items-center gap-1.5 mb-1">
              <Layers className="w-3 h-3" /> Entity: {currentApp.id?.slice(0, 8)}
            </div>
            <div className="flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" /> Stage: {currentApp.stage}
            </div>
          </div>
        )}
      </aside>

      {/* Center Panel — Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium capitalize">{currentView}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs bg-zinc-800 rounded-lg hover:bg-zinc-700">Preview</button>
            <button className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1">
              <Rocket className="w-3 h-3" /> Deploy
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {currentView === 'pages' && <PagesView appId={id} />}
          {currentView === 'entities' && <EntitiesView appId={id} />}
          {currentView === 'functions' && <FunctionsView appId={id} />}
          {currentView === 'chat' && <ChatView appId={id} />}
          {currentView === 'deploy' && <DeployView appId={id} />}
          {currentView === 'settings' && <SettingsView appId={id} />}
        </div>
      </div>
    </div>
  )
}

// === PAGES VIEW ===
function PagesView({ appId }: { appId: string }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Pages</h3>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm"><Plus className="w-3 h-3" /> New Page</button>
      </div>
      <div className="space-y-2">
        {['/', '/about', '/dashboard', '/api/health'].map(path => (
          <div key={path} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-indigo-600">
            <FileCode className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-mono">{path}</span>
            <span className="text-xs text-zinc-500 ml-auto">React / TSX</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// === ENTITIES VIEW ===
function EntitiesView({ appId }: { appId: string }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Data Entities</h3>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm"><Plus className="w-3 h-3" /> New Entity</button>
      </div>
      <div className="space-y-3">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-indigo-500" />
            <span className="font-medium text-sm">users</span>
            <span className="text-xs text-zinc-500 ml-auto">6 fields</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['id: uuid', 'email: text', 'name: text', 'role: text', 'created_at: timestamptz', 'updated_at: timestamptz'].map(f => (
              <span key={f} className="text-xs px-2 py-1 bg-zinc-800 rounded font-mono">{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// === FUNCTIONS VIEW ===
function FunctionsView({ appId }: { appId: string }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Backend Functions</h3>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm"><Plus className="w-3 h-3" /> New Function</button>
      </div>
      <div className="space-y-2">
        {['sendEmail', 'generateReport', 'processPayment', 'syncData'].map(fn => (
          <div key={fn} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-indigo-600">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-mono">{fn}()</span>
            <span className="text-xs text-zinc-500 ml-auto">POST</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// === CHAT VIEW (AI Builder) ===
function ChatView({ appId }: { appId: string }) {
  const { messages, addMessage, updateMessage, isStreaming, setStreaming } = useChatStore()
  const [input, setInput] = useState('')
  // ... simplified for push size
  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">AI Builder</h3>
            <p className="text-sm text-zinc-500">Describe what you want to build and AI will generate it</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && input.trim() && addMessage({ id: Math.random().toString(), role: 'user', content: input, timestamp: new Date().toISOString() }) || setInput('')}
          placeholder="Build something..." className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-indigo-600" />
        <button className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm">Send</button>
      </div>
    </div>
  )
}

// === DEPLOY VIEW ===
function DeployView({ appId }: { appId: string }) {
  return (
    <div className="p-6 max-w-2xl">
      <h3 className="font-semibold mb-4">Deployment</h3>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Status</span>
          <span className="text-sm text-green-500">● Not deployed</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Domain</span>
          <span className="text-sm font-mono">Not configured</span>
        </div>
        <button className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2">
          <Rocket className="w-4 h-4" /> Deploy to Vercel
        </button>
      </div>
    </div>
  )
}

// === SETTINGS VIEW ===
function SettingsView({ appId }: { appId: string }) {
  return (
    <div className="p-6 max-w-2xl">
      <h3 className="font-semibold mb-4">App Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-zinc-400 mb-1 block">App Name</label>
          <input className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm" defaultValue="My App" />
        </div>
        <div>
          <label className="text-sm text-zinc-400 mb-1 block">Description</label>
          <textarea className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm" rows={3} />
        </div>
      </div>
    </div>
  )
}

import { useChatStore } from '@/lib/store'