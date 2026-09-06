import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Folder, Plus, X, Check, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function ProjectFolders() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const { pathname } = useLocation();

  const load = async () => {
    try {
      const rows = await base44.entities.ProjectFolder.list('-created_date', 50);
      setFolders(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await base44.entities.ProjectFolder.create({ name: newName.trim() });
      setNewName('');
      setCreating(false);
      await load();
    } catch (e) {
      alert('Failed to create folder: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-2">
      <div className="flex items-center px-2 py-1.5">
        <Folder className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Projects</span>
        <button
          onClick={() => setCreating(!creating)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="New project folder"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {creating && (
        <div className="px-2 pb-2">
          <div className="flex items-center gap-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
              placeholder="Folder name…"
              autoFocus
              className="flex-1 bg-background rounded-md px-2 py-1.5 text-xs outline-none border border-border/60 focus:ring-1 focus:ring-ring"
            />
            <button onClick={create} disabled={saving || !newName.trim()} className="p-1.5 rounded-md bg-foreground text-background disabled:opacity-40">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
            <button onClick={() => { setCreating(false); setNewName(''); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {loading ? (
          <div className="px-2.5 py-1.5 text-xs text-muted-foreground">Loading…</div>
        ) : folders.length === 0 && !creating ? (
          <div className="px-2.5 py-1.5 text-xs text-muted-foreground/60">No projects yet — click + to create one</div>
        ) : (
          folders.map((f) => {
            const active = pathname === `/folder/${f.id}`;
            return (
              <Link
                key={f.id}
                to={`/folder/${f.id}`}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                  active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Folder className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{f.name}</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}