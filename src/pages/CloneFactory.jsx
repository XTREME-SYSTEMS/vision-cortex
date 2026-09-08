import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { DEEP_PIPELINE_STAGES } from '@/data/cloneFactoryTemplates';
import { ListPlus, Copy, ShieldCheck, RefreshCw, Library, Palette, Rocket } from 'lucide-react';
import CloneQueueTab from '@/components/clonefactory/CloneQueueTab';
import CloneProgressTab from '@/components/clonefactory/CloneProgressTab';
import CloneLibraryTab from '@/components/clonefactory/CloneLibraryTab';
import RebrandTab from '@/components/clonefactory/RebrandTab';
import ProvisionTab from '@/components/clonefactory/ProvisionTab';
import TopologyMap from '@/components/clone/TopologyMap';

const TABS = [
  { key: 'queue', label: 'Queue', icon: ListPlus },
  { key: 'clone', label: 'DEEP Clone', icon: Copy },
  { key: 'library', label: 'Library', icon: Library },
  { key: 'rebrand', label: 'Rebrand', icon: Palette },
  { key: 'provision', label: 'Provision', icon: Rocket },
];

export default function CloneFactory() {
  const [tab, setTab] = useState('queue');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState(null);
  const [libraryRefresh, setLibraryRefresh] = useState(0);

  const loadJobs = useCallback(async () => {
    try {
      const list = await base44.entities.CloneJob.list('-created_date', 200);
      setJobs(list || []);
    } catch { setJobs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleJobUpdate = useCallback(() => { loadJobs(); }, [loadJobs]);

  const handleSavedToLibrary = useCallback(() => {
    setLibraryRefresh(f => f + 1);
  }, []);

  const selectJob = (job) => {
    setActiveJob(job);
  };

  // Auto-select first queued job when switching to clone/rebrand/provision tabs
  useEffect(() => {
    if ((tab === 'clone' || tab === 'rebrand' || tab === 'provision') && !activeJob && jobs.length > 0) {
      const firstActive = jobs.find(j => j.status !== 'completed') || jobs[0];
      setActiveJob(firstActive);
    }
  }, [tab, activeJob, jobs]);

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading">DEEP Clone Factory</h1>
          <p className="text-xs text-muted-foreground">Universal system cloning · validation · rebranding · multi-cloud deployment — 100% parity gate</p>
        </div>
        <div className="hidden md:block w-64">
          <TopologyMap activeFlow={tab === 'clone'} />
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="grid grid-cols-7 gap-1.5">
        {DEEP_PIPELINE_STAGES.map(s => {
          const StageIcon = { ListPlus, Copy, ShieldCheck, RefreshCw, Library, Palette, Rocket }[s.icon] || Copy;
          const isActive = (s.key === 'queue' && tab === 'queue') ||
            (s.key === 'clone' && tab === 'clone') ||
            (s.key === 'validate' && tab === 'clone') ||
            (s.key === 'retry' && tab === 'clone') ||
            (s.key === 'library' && tab === 'library') ||
            (s.key === 'rebrand' && tab === 'rebrand') ||
            (s.key === 'provision' && tab === 'provision');
          return (
            <div key={s.id} className={cn('border rounded-lg p-2 text-center transition-colors',
              isActive ? 'bg-violet-500/10 border-violet-500/40' : 'bg-card border-border/40')}>
              <StageIcon className={cn('w-4 h-4 mx-auto mb-1', isActive ? 'text-violet-500' : 'text-muted-foreground')} />
              <p className="text-[10px] font-medium leading-tight">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn('flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                tab === t.key ? 'border-violet-500 text-violet-500' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.key === 'queue' && jobs.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{jobs.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active job selector (for clone/rebrand/provision tabs) */}
      {(tab === 'clone' || tab === 'rebrand' || tab === 'provision') && jobs.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Active job:</span>
          <select
            value={activeJob?.id || ''}
            onChange={e => setActiveJob(jobs.find(j => j.id === e.target.value))}
            className="border border-input bg-background rounded-md px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
          >
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.site_name} — {j.status}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tab content */}
      <div>
        {tab === 'queue' && <CloneQueueTab jobs={jobs} loading={loading} onRefresh={loadJobs} />}
        {tab === 'clone' && <CloneProgressTab activeJob={activeJob} onJobUpdate={handleJobUpdate} onSavedToLibrary={handleSavedToLibrary} />}
        {tab === 'library' && <CloneLibraryTab refreshKey={libraryRefresh} />}
        {tab === 'rebrand' && <RebrandTab activeJob={activeJob} />}
        {tab === 'provision' && <ProvisionTab activeJob={activeJob} />}
      </div>
    </div>
  );
}