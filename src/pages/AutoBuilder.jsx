import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Loader2, Trash2, Zap, Pause, Play, CheckCircle, AlertCircle, Clock, Hammer, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCT_TYPES = [
  { value: 'marketing_site', label: 'Marketing Site', icon: Building2 },
  { value: 'web_app', label: 'Web App', icon: Zap },
  { value: 'ecommerce', label: 'E-Commerce', icon: Hammer },
  { value: 'platform', label: 'Platform', icon: Building2 },
];

const STEP_ROUTES = {
  profile: '/quote',
  vision: '/vision',
  strategy: '/blueprint',
  brand: '/company',
  content: '/factory',
  website: '/clone-factory',
  social: '/marketer',
  deploy: '/build',
  complete: '/',
};

export default function AutoBuilder() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');
  const [productType, setProductType] = useState('marketing_site');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.AutoBuild.list('-created_date', 100);
      setBuilds(list || []);
    } catch {
      setBuilds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const anyRunning = builds.some(b => b.status === 'running');
    if (!anyRunning) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [builds, load]);

  const createBuild = async () => {
    if (!businessName.trim()) { setError('Business name is required.'); return; }
    setCreating(true);
    setError('');
    try {
      const created = await base44.entities.AutoBuild.create({
        business_name: businessName.trim(),
        industry: industry.trim(),
        product_type: productType,
        current_step: 'profile',
        status: 'queued',
        visited_steps: [],
        logs: [`[${new Date().toISOString()}] Build created`],
      });
      setBusinessName('');
      setIndustry('');
      load();
      navigate('/quote');
    } catch {
      setError('Couldn\'t create build. Try again.');
    } finally {
      setCreating(false);
    }
  };

  const deleteBuild = async (id, e) => {
    e.stopPropagation();
    try {
      await base44.entities.AutoBuild.delete(id);
      load();
    } catch {}
  };

  const toggleAutoAdvance = async (build, e) => {
    e.stopPropagation();
    try {
      await base44.entities.AutoBuild.update(build.id, { auto_advance: !build.auto_advance });
      load();
    } catch {}
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-amber-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-heading font-bold flex items-center gap-2">
          <Hammer className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Auto Builder
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Create and manage autonomous build pipelines. Each build walks through a complete pipeline: profile → vision → strategy → brand → content → website → social → deploy.
        </p>
      </div>

      {/* Create new build */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> New Build</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="Business name"
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
          />
          <input
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            placeholder="Industry (e.g. epoxy, hvac)"
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
          />
          <select
            value={productType}
            onChange={e => setProductType(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
          >
            {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={createBuild}
          disabled={creating}
          className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Build
        </button>
      </div>

      {/* Build list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : builds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No builds yet. Create one above to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {builds.map(build => (
            <div
              key={build.id}
              className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => navigate(STEP_ROUTES[build.current_step] || '/')}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcon(build.status)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{build.business_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {build.industry || '—'} · {build.product_type} · Step: {build.current_step}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => toggleAutoAdvance(build, e)}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      build.auto_advance ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    )}
                    title={build.auto_advance ? 'Auto-advance ON' : 'Auto-advance OFF'}
                  >
                    {build.auto_advance ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => deleteBuild(build.id, e)}
                    className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {build.logs?.length > 0 && (
                <p className="text-[10px] text-muted-foreground/60 mt-1.5 truncate">
                  {build.logs[build.logs.length - 1]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}