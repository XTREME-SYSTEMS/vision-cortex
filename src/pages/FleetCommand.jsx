import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import EngineCard from '@/components/fleet/EngineCard';
import CapabilityMatrix from '@/components/fleet/CapabilityMatrix';
import { Server, Activity, Shield, Zap, Plus, RefreshCw, Wrench, CheckCircle, AlertTriangle, Globe, Cpu, Layers } from 'lucide-react';

export default function FleetCommand() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [autoFixLog, setAutoFixLog] = useState([]);
  const [newEngine, setNewEngine] = useState({ engine_id: '', name: '', url: '', api_key_secret: '', provider: 'railway', region: 'us-east', priority: 10, role: 'backup' });

  const load = useCallback(async () => {
    try {
      const s = await base44.functions.invoke('browserFleetManager', { action: 'fleet_status' });
      setStatus(s);
    } catch (e) {
      setStatus({ error: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const doAction = async (action, payload = {}) => {
    setActing(true);
    try {
      const r = await base44.functions.invoke('browserFleetManager', { action, ...payload });
      if (action === 'auto_fix' && r.actions) {
        setAutoFixLog(prev => [...(r.actions || []).map(a => ({ ...a, timestamp: new Date().toISOString() })), ...prev].slice(0, 20));
      }
      if (action === 'bootstrap' || action === 'register' || action === 'remove' || action === 'failover') {
        setShowAdd(false);
      }
      load();
      return r;
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  };

  const handleRegister = async () => {
    if (!newEngine.engine_id || !newEngine.name || !newEngine.url || !newEngine.api_key_secret) return;
    await doAction('register', newEngine);
    setNewEngine({ engine_id: '', name: '', url: '', api_key_secret: '', provider: 'railway', region: 'us-east', priority: 10, role: 'backup' });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const fleet = status?.fleet || {};
  const engines = status?.engines || [];
  const allCaps = status?.all_capabilities || [];
  const catalog = status?.capability_catalog || [];
  const noFleet = engines.length === 0 && !status?.error;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Infrastructure · Multi-Cloud Browser Fleet</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">
          Fleet Command.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Enterprise-grade multi-cloud browser engine fleet with automatic failover, self-healing, and {catalog.length}+ tracked capabilities. Designed for 24/7 fault-tolerant operations.
        </p>
      </div>

      {/* Fleet overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Server} label="Total Engines" value={fleet.total_engines || 0} color="text-sky-500" />
        <StatCard icon={CheckCircle} label="Healthy" value={fleet.healthy || 0} color="text-emerald-500" />
        <StatCard icon={AlertTriangle} label="Degraded" value={fleet.degraded || 0} color="text-amber-500" />
        <StatCard icon={AlertTriangle} label="Critical/Offline" value={(fleet.critical || 0) + (fleet.offline || 0)} color="text-rose-500" />
        <StatCard icon={Activity} label="Avg Health" value={`${fleet.avg_health || 0}%`} color="text-violet-500" />
        <StatCard icon={Layers} label="Capabilities" value={fleet.unique_capabilities || 0} color="text-blue-500" />
      </div>

      {/* Bootstrap prompt */}
      {noFleet && (
        <Card className="p-6 border-border/60 text-center">
          <Server className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No engines registered yet</p>
          <p className="text-xs text-muted-foreground mb-4">Bootstrap the fleet from your existing engine secrets to get started.</p>
          <Button onClick={() => doAction('bootstrap')} disabled={acting} size="sm">
            {acting ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            Bootstrap Fleet
          </Button>
        </Card>
      )}

      {/* Action bar */}
      {engines.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => doAction('health_check')} disabled={acting} size="sm" variant="outline">
            {acting ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-1.5" />}
            Health Check
          </Button>
          <Button onClick={() => doAction('auto_fix')} disabled={acting} size="sm" variant="outline">
            <Wrench className="w-3.5 h-3.5 mr-1.5" />
            Auto-Fix
          </Button>
          <Button onClick={() => setShowAdd(!showAdd)} size="sm" variant="outline">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Engine
          </Button>
          <Button onClick={() => setShowMatrix(!showMatrix)} size="sm" variant="outline">
            <Cpu className="w-3.5 h-3.5 mr-1.5" />
            {showMatrix ? 'Hide' : 'Show'} Capability Matrix
          </Button>
          <div className="ml-auto text-[10px] text-muted-foreground">
            Primary: <span className="font-mono font-medium text-foreground">{fleet.primary_engine || '—'}</span>
            {' · '}Success: <span className="font-mono font-medium text-emerald-500">{fleet.success_rate || 0}%</span>
            {' · '}Requests: <span className="font-mono font-medium">{fleet.total_requests || 0}</span>
          </div>
        </div>
      )}

      {/* Add engine form */}
      {showAdd && (
        <Card className="p-5 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-medium">Register New Engine</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Engine ID</Label>
              <Input value={newEngine.engine_id} onChange={e => setNewEngine({ ...newEngine, engine_id: e.target.value })} placeholder="prod-backup-02" className="text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Name</Label>
              <Input value={newEngine.name} onChange={e => setNewEngine({ ...newEngine, name: e.target.value })} placeholder="Production Backup 02" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">URL</Label>
              <Input value={newEngine.url} onChange={e => setNewEngine({ ...newEngine, url: e.target.value })} placeholder="https://engine.example.com" className="text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">API Key Secret Name</Label>
              <Input value={newEngine.api_key_secret} onChange={e => setNewEngine({ ...newEngine, api_key_secret: e.target.value })} placeholder="CLOUD_BROWSER_BACKUP_KEY" className="text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Provider</Label>
              <select value={newEngine.provider} onChange={e => setNewEngine({ ...newEngine, provider: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="railway">Railway</option>
                <option value="vercel">Vercel</option>
                <option value="render">Render</option>
                <option value="fly">Fly.io</option>
                <option value="heroku">Heroku</option>
                <option value="digitalocean">DigitalOcean</option>
                <option value="aws">AWS</option>
                <option value="gcp">GCP</option>
                <option value="azure">Azure</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Region</Label>
              <Input value={newEngine.region} onChange={e => setNewEngine({ ...newEngine, region: e.target.value })} placeholder="us-east" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Priority (1 = highest)</Label>
              <Input type="number" value={newEngine.priority} onChange={e => setNewEngine({ ...newEngine, priority: parseInt(e.target.value) || 10 })} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Role</Label>
              <select value={newEngine.role} onChange={e => setNewEngine({ ...newEngine, role: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="primary">Primary</option>
                <option value="backup">Backup</option>
                <option value="standby">Standby</option>
                <option value="canary">Canary</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button onClick={handleRegister} disabled={acting || !newEngine.engine_id || !newEngine.url} size="sm">
              {acting ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              Register Engine
            </Button>
            <span className="text-[10px] text-muted-foreground">The API key secret must already exist in Settings → Secrets</span>
          </div>
        </Card>
      )}

      {/* Engine grid */}
      {engines.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {engines.map(eng => (
            <EngineCard key={eng.engine_id} engine={eng} onAction={doAction} acting={acting} />
          ))}
        </div>
      )}

      {/* Capability matrix */}
      {showMatrix && engines.length > 0 && (
        <Card className="p-5 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-medium">Capability Matrix</h3>
            <Badge variant="outline" className="text-[9px] ml-2">{allCaps.length} active · {catalog.length} total</Badge>
          </div>
          <CapabilityMatrix engines={engines} allCapabilities={catalog.length > 0 ? catalog : allCaps} />
        </Card>
      )}

      {/* Auto-fix log */}
      {autoFixLog.length > 0 && (
        <Card className="p-5 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-medium">Auto-Fix Log</h3>
          </div>
          <div className="space-y-1.5">
            {autoFixLog.map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border border-border/40 bg-muted/20">
                {log.action === 'recovered' ? <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> :
                 log.action === 'failover' ? <Shield className="w-3 h-3 text-amber-500 shrink-0" /> :
                 log.action === 'restart_attempted' ? <RefreshCw className="w-3 h-3 text-blue-500 shrink-0" /> :
                 <AlertTriangle className="w-3 h-3 text-muted-foreground shrink-0" />}
                <span className="font-mono text-[10px] text-muted-foreground">{log.timestamp?.slice(11, 19)}</span>
                <span className="flex-1">
                  {log.engine_id && <span className="font-medium">{log.engine_id}: </span>}
                  <span className="text-muted-foreground capitalize">{log.action?.replace(/_/g, ' ')}</span>
                  {log.reason && <span className="text-muted-foreground"> — {log.reason}</span>}
                  {log.from && <span className="text-muted-foreground"> {log.from} → {log.to}</span>}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Architecture info */}
      <Card className="p-5 border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-medium">Fault-Tolerance Architecture</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ArchFeature icon={Layers} title="Multi-Engine Failover" desc="Requests try engines in priority order. If one fails, the next takes over automatically." />
          <ArchFeature icon={Wrench} title="Self-Healing" desc="Failed engines are auto-probed and restarted. Backups promote to primary when the primary goes down." />
          <ArchFeature icon={Activity} title="Health Monitoring" desc="Continuous health probes update rolling scores. Degraded engines are detected before they fail." />
          <ArchFeature icon={Globe} title="Direct-Fetch Fallback" desc="If all engines are down, a built-in direct HTTP fetcher ensures the pipeline still produces results." />
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('w-3 h-3', color)} />
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <span className={cn('text-lg font-bold', color)}>{value}</span>
    </div>
  );
}

function ArchFeature({ icon: Icon, title, desc }) {
  return (
    <div className="p-3 rounded-lg border border-border/40">
      <Icon className="w-4 h-4 text-muted-foreground mb-2" />
      <p className="text-xs font-medium mb-1">{title}</p>
      <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
    </div>
  );
}