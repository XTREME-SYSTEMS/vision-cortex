'use client'

import { useState, useEffect } from 'react'
import { supabase, insert, update, remove } from '@/lib/supabase'
import { Database, Plus, Edit2, Trash2, X, Check } from 'lucide-react'

const TABLES = ['ideas', 'agent_profiles', 'agent_logs', 'chat_messages', 'intel_feed', 'trades', 'portfolios', 'doctrines', 'governance', 'vision_pipelines', 'build_queue', 'system_enhancements']

export default function EntitiesPage() {
  const [selectedTable, setSelectedTable] = useState('ideas')
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [showAdd, setShowAdd] = useState(false)

  const loadRecords = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from(selectedTable).select('*').order('created_at', { ascending: false }).limit(50)
      setRecords(data || [])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRecords() }, [selectedTable])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return
    await remove(selectedTable, id)
    loadRecords()
  }

  const columns = records[0] ? Object.keys(records[0]).filter(k => k !== 'id') : []

  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-border p-2">
        <div className="flex items-center gap-2 px-2 py-3">
          <Database className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Entities</span>
        </div>
        {TABLES.map(t => (
          <button key={t} onClick={() => setSelectedTable(t)}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg ${selectedTable === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <h1 className="text-lg font-semibold">{selectedTable}</h1>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : records.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No records yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {columns.slice(0, 6).map(c => (
                    <th key={c} className="text-left px-3 py-2 font-medium text-muted-foreground">{c}</th>
                  ))}
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30">
                    {columns.slice(0, 6).map(c => (
                      <td key={c} className="px-3 py-2 text-muted-foreground truncate max-w-xs">{String(r[c] ?? '').substring(0, 50)}</td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(r)} className="p-1 hover:bg-secondary rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1 hover:bg-secondary rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}