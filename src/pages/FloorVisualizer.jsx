import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, Loader2, RefreshCw, Plus, Trash2, Share2, Download, Sparkles, Palette, Layers, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROOM_TYPES = [
  { value: 'garage', label: 'Garage' },
  { value: 'basement', label: 'Basement' },
  { value: 'living_room', label: 'Living Room' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'patio', label: 'Patio' },
  { value: 'driveway', label: 'Driveway' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'retail', label: 'Retail' },
  { value: 'office', label: 'Office' },
  { value: 'restaurant', label: 'Restaurant' },
];

const FINISH_TYPES = [
  { value: 'metallic', label: 'Metallic', desc: 'Reflective, premium look' },
  { value: 'flake', label: 'Flake', desc: 'Decorative color flakes' },
  { value: 'solid', label: 'Solid', desc: 'Uniform solid color' },
  { value: 'quartz', label: 'Quartz', desc: 'Textured, slip-resistant' },
  { value: 'polished', label: 'Polished', desc: 'Smooth, glossy concrete' },
  { value: 'matte', label: 'Matte', desc: 'Low-sheen finish' },
];

export default function FloorVisualizer() {
  const [sessions, setSessions] = useState([]);
  const [floorSystems, setFloorSystems] = useState([]);
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [form, setForm] = useState({
    session_name: '',
    room_type: 'garage',
    finish_type: 'flake',
    color_choice: '',
    floor_system: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, fs, cc] = await Promise.all([
        base44.entities.VisualizerSession.list('-created_date', 50),
        base44.entities.FloorSystem.filter({ active: true }),
        base44.entities.ColorChart.filter({ active: true }),
      ]);
      setSessions(s || []);
      setFloorSystems(fs || []);
      setColors(cc || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createSession = async () => {
    if (!form.session_name.trim()) return;
    setCreating(true);
    try {
      const created = await base44.entities.VisualizerSession.create({
        ...form,
        status: 'draft',
      });
      setSelectedSession(created);
      setForm({ session_name: '', room_type: 'garage', finish_type: 'flake', color_choice: '', floor_system: '', notes: '' });
      load();
    } catch {
    } finally {
      setCreating(false);
    }
  };

  const generateVisualization = async (session) => {
    if (!session) return;
    setGenerating(true);
    try {
      const color = colors.find(c => c.name === session.color_choice);
      const system = floorSystems.find(s => s.name === session.floor_system);

      const prompt = `Generate a photorealistic image of a ${session.room_type.replace('_', ' ')} with ${session.finish_type} flooring.
${color ? `Color: ${color.name} (${color.hex_code}).` : ''}
${system ? `Floor system: ${system.name}.` : ''}
Make it look professional, well-lit, and showcase the flooring as the primary feature.
Style: modern, clean, high-quality interior photography.`;

      const res = await base44.integrations.Core.GenerateImage({ prompt });
      const resultImageUrl = res?.url || '';

      // Get AI analysis
      const analysisPrompt = `Analyze this flooring visualization:
Room: ${session.room_type}
Finish: ${session.finish_type}
Color: ${color?.name || 'default'}
System: ${system?.name || 'standard'}

Provide recommendations for:
1. Recommended systems (array of system names)
2. Estimated cost (number, total project)
3. Estimated timeline (string)
4. Design notes (string, brief assessment)

Return JSON.`;

      const analysis = await base44.functions.invoke('aiGatewayGenerate', {
        prompt: analysisPrompt,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            recommended_systems: { type: 'array', items: { type: 'string' } },
            estimated_cost: { type: 'number' },
            estimated_timeline: { type: 'string' },
            design_notes: { type: 'string' },
          },
        },
      });

      const aiAnalysis = analysis.data || analysis;

      await base44.entities.VisualizerSession.update(session.id, {
        result_image_url: resultImageUrl,
        color_hex: color?.hex_code || '',
        ai_analysis: aiAnalysis,
        status: 'completed',
      });

      load();
      setSelectedSession(null);
    } catch {
    } finally {
      setGenerating(false);
    }
  };

  const deleteSession = async (id) => {
    try {
      await base44.entities.VisualizerSession.delete(id);
      load();
    } catch {}
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-heading font-bold flex items-center gap-2">
          <Eye className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Floor Visualizer
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Visualize flooring options on any room type. Generate photorealistic previews with AI, get cost estimates, and convert to leads.
        </p>
      </div>

      {/* New session form */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> New Visualization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={form.session_name}
            onChange={e => setForm({ ...form, session_name: e.target.value })}
            placeholder="Session name (e.g. Smith Garage Quote)"
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
          />
          <select
            value={form.room_type}
            onChange={e => setForm({ ...form, room_type: e.target.value })}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
          >
            {ROOM_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select
            value={form.finish_type}
            onChange={e => setForm({ ...form, finish_type: e.target.value })}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
          >
            {FINISH_TYPES.map(f => <option key={f.value} value={f.value}>{f.label} — {f.desc}</option>)}
          </select>
          <select
            value={form.floor_system}
            onChange={e => setForm({ ...form, floor_system: e.target.value })}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
          >
            <option value="">Select floor system…</option>
            {floorSystems.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select
            value={form.color_choice}
            onChange={e => setForm({ ...form, color_choice: e.target.value })}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
          >
            <option value="">Select color…</option>
            {colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <input
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes (optional)"
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
          />
        </div>
        <button
          onClick={createSession}
          disabled={creating || !form.session_name.trim()}
          className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Session
        </button>
      </div>

      {/* Color palette preview */}
      {colors.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium flex items-center gap-2 mb-2"><Palette className="h-4 w-4 text-primary" /> Color Palette</h3>
          <div className="flex gap-2 flex-wrap">
            {colors.slice(0, 20).map(c => (
              <div key={c.id} className="flex flex-col items-center gap-1">
                <div
                  className="w-10 h-10 rounded-lg border border-border"
                  style={{ backgroundColor: c.hex_code }}
                  title={c.name}
                />
                <span className="text-[9px] text-muted-foreground truncate max-w-[60px]">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No visualizations yet. Create one above to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessions.map(session => (
            <div key={session.id} className="rounded-lg border border-border bg-card overflow-hidden">
              {session.result_image_url ? (
                <img src={session.result_image_url} alt={session.session_name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-muted flex items-center justify-center">
                  <Square className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{session.session_name}</p>
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full',
                    session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                    session.status === 'visualizing' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {session.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {session.room_type?.replace('_', ' ')} · {session.finish_type} · {session.color_choice || 'default'}
                </p>
                {session.ai_analysis?.estimated_cost > 0 && (
                  <p className="text-xs text-emerald-500 font-medium">
                    Est. ${session.ai_analysis.estimated_cost.toLocaleString()} · {session.ai_analysis.estimated_timeline}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {session.status === 'draft' && (
                    <button
                      onClick={() => generateVisualization(session)}
                      disabled={generating}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generate
                    </button>
                  )}
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}