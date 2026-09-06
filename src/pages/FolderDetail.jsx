import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Folder, Trash2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function FolderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const f = await base44.entities.ProjectFolder.get(id);
      setFolder(f);
      setName(f.name || '');
      setDescription(f.description || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.ProjectFolder.update(id, { name, description });
      await load();
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this project folder?')) return;
    setDeleting(true);
    try {
      await base44.entities.ProjectFolder.delete(id);
      navigate('/');
    } catch (e) {
      alert('Failed to delete: ' + e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!folder) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Folder not found</div>;
  }

  return (
    <div className="h-full flex flex-col p-5 overflow-y-auto">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-10 h-10 rounded-xl bg-foreground text-background grid place-items-center">
          <Folder className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-tight">{folder.name}</h1>
          <p className="text-xs text-muted-foreground">Project folder</p>
        </div>
      </div>

      <Card className="p-5 border-border/60 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border/60 focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What is this project about?"
              className="w-full bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border/60 focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={save} disabled={saving || !name.trim()} size="sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </Button>
            <Button onClick={remove} disabled={deleting} size="sm" variant="outline" className="text-destructive">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-4 text-xs text-muted-foreground">
        Created {new Date(folder.created_date).toLocaleDateString()}
      </div>
    </div>
  );
}