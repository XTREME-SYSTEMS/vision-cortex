'use client'

import { useState, useEffect } from 'react'
import { supabase, insertRow } from '@/lib/supabase'
import { Plus, Search, MoreVertical, Globe, Database, Zap, Settings, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newAppName, setNewAppName] = useState('')
  const [newAppDesc, setNewAppDesc] = useState('')
  const [search, setSearch] = useState('')

  const loadApps = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('ideas').select('*').order('created_at', { ascending: false }).limit(50)
      setApps(data || [])
    } catch {
      setApps([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadApps() }, [])

  const createApp = async () => {
    if (!newAppName.trim()) return
    try {
      const app = await insertRow('ideas', {
        title: newAppName,
        one_liner: newAppDesc,
        stage: 'discovered',
        discovered_by: 'user',
      })
      setShowCreate(false)
      setNewAppName('')
      setNewAppDesc('')
      window.location.href = `/app/${app.id}`
    } catch (e) {
      alert('Failed to create app: ' + (e instanceof Error ? e.message : 'unknown'))
    }
  }

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">B</div>
          <span className="font-bold text-lg">Base44</span>
          <span className="text-xs text-zinc-500 ml-2">AI App Builder</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> New App
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">U</div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Apps</h1>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search apps..."
              className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-indigo-600 w-64" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-zinc-500">Loading your apps...</div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No apps yet</h3>
            <p className="text-zinc-500 text-sm mb-4">Create your first AI-powered app</p>
            <button onClick={() => setShowCreate(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Create App</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {apps.filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase())).map(app => (
              <Link key={app.id} href={`/app/${app.id}`}
                className="group bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-indigo-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {app.title?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <MoreVertical className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100" />
                </div>
                <h3 className="font-semibold text-sm mb-1 truncate">{app.title}</h3>
                <p className="text-xs text-zinc-500 line-clamp-2">{app.one_liner || 'No description'}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-400">{app.stage || 'draft'}</span>
                  <span className="text-xs text-zinc-600">{new Date(app.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Create New App</h2>
            <div className="space-y-3">
              <input value={newAppName} onChange={(e) => setNewAppName(e.target.value)} placeholder="App name (e.g. Task Manager)"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-600" />
              <textarea value={newAppDesc} onChange={(e) => setNewAppDesc(e.target.value)} placeholder="Describe what it does..." rows={3}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-600 resize-none" />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700">Cancel</button>
                <button onClick={createApp} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}