import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, ScanSearch, Palette, Check, AlertTriangle, RefreshCw, Image as ImageIcon, Type, Copyright } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REBRAND_SEVERITY } from '@/data/cloneFactoryTemplates';

export default function RebrandTab({ activeJob }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [expandedAsset, setExpandedAsset] = useState(null);

  const loadAssets = useCallback(async () => {
    if (!activeJob) return;
    setLoading(true);
    try {
      const list = await base44.entities.CloneRebrandAsset.filter({ clone_job_id: activeJob.id });
      setAssets(list || []);
    } catch { setAssets([]); }
    finally { setLoading(false); }
  }, [activeJob]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const handleScan = async () => {
    if (!activeJob) return;
    setScanning(true);
    try {
      const res = await base44.functions.invoke('rebrandCloneAssets', {
        action: 'scan',
        clone_job_id: activeJob.id,
        template_id: activeJob.template_id,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      await loadAssets();
    } catch (e) { alert('Scan failed: ' + e.message); }
    finally { setScanning(false); }
  };

  const handleRegenerate = async (assetId) => {
    setRegenerating(true);
    try {
      const res = await base44.functions.invoke('rebrandCloneAssets', {
        action: 'regenerate',
        asset_id: assetId,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      await loadAssets();
    } catch (e) { alert('Regenerate failed: ' + e.message); }
    finally { setRegenerating(false); }
  };

  const handleApprove = async (assetId, revisionIndex) => {
    try {
      await base44.functions.invoke('rebrandCloneAssets', {
        action: 'approve',
        asset_id: assetId,
        revision_index: revisionIndex,
      });
      await loadAssets();
    } catch (e) { alert('Approve failed: ' + e.message); }
  };

  const handleRegenerateAll = async () => {
    if (!activeJob) return;
    setRegenerating(true);
    try {
      await base44.functions.invoke('rebrandCloneAssets', {
        action: 'regenerate',
        clone_job_id: activeJob.id,
      });
      await loadAssets();
    } catch (e) { alert('Regenerate all failed: ' + e.message); }
    finally { setRegenerating(false); }
  };

  if (!activeJob) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border/40 rounded-xl">
        <Palette className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Select a job from the Queue tab to run the rebrand scanner.
      </div>
    );
  }

  const stats = {
    total: assets.length,
    critical: assets.filter(a => a.severity === 'critical').length,
    approved: assets.filter(a => a.status === 'approved').length,
    pending: assets.filter(a => a.status === 'scanned' || a.status === 'revising').length,
  };

  const assetIcon = {
    logo: ImageIcon, image: ImageIcon, text: Type, brand_name: Type,
    copyright: Copyright, trademark: Copyright, color: Palette, font: Type,
    tagline: Type, contact_info: Type,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-muted/40">{stats.total} assets</span>
          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500">{stats.critical} critical</span>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500">{stats.pending} pending</span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500">{stats.approved} approved</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleRegenerateAll} disabled={regenerating || assets.length === 0}>
            {regenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Regenerate All
          </Button>
          <Button size="sm" onClick={handleScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5 mr-1.5" />}
            Scan for IP Assets
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border/40 rounded-xl">
          <ScanSearch className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No rebrand assets scanned yet. Click "Scan for IP Assets" to identify logos, text, and content that must change.
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map(asset => {
            const Icon = assetIcon[asset.asset_type] || Type;
            const sev = REBRAND_SEVERITY[asset.severity] || REBRAND_SEVERITY.warning;
            const isExpanded = expandedAsset === asset.id;
            return (
              <div key={asset.id} className={cn('border rounded-lg p-3 bg-card', sev.border)}>
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedAsset(isExpanded ? null : asset.id)}>
                  <Icon className={cn('w-4 h-4 shrink-0', sev.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{asset.asset_type}</span>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', sev.bg, sev.color)}>{asset.severity}</span>
                      {asset.status === 'approved' && <Check className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{asset.description} {asset.location && `· ${asset.location}`}</p>
                  </div>
                  {asset.must_change && <AlertTriangle className={cn('w-3.5 h-3.5 shrink-0', sev.color)} />}
                </div>

                {/* Original content */}
                {asset.original_content && (
                  <div className="mt-2 text-[11px] border-l-2 border-rose-500/30 pl-2">
                    <span className="text-rose-500 font-medium">Original:</span> <span className="text-muted-foreground">{asset.original_content}</span>
                  </div>
                )}
                {asset.legal_reason && (
                  <p className="mt-1 text-[10px] text-amber-500">Reason: {asset.legal_reason}</p>
                )}

                {/* Revisions */}
                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revisions ({asset.revisions?.length || 0}/10)</p>
                      <button onClick={(e) => { e.stopPropagation(); handleRegenerate(asset.id); }} disabled={regenerating} className="text-[10px] text-violet-500 hover:underline">
                        {regenerating ? 'Generating...' : 'Regenerate 10 options'}
                      </button>
                    </div>
                    {asset.revisions?.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">No revisions yet. Click "Regenerate" to create 10 options.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5">
                        {asset.revisions.map((rev, i) => (
                          <div key={i} className={cn('flex items-start gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors',
                            asset.approved_revision_index === i ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border/40 hover:border-border')}
                            onClick={(e) => { e.stopPropagation(); handleApprove(asset.id, i); }}>
                            <span className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0',
                              asset.approved_revision_index === i ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground')}>
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium">{rev.content}</p>
                              {rev.style_notes && <p className="text-[10px] text-muted-foreground mt-0.5">{rev.style_notes}</p>}
                            </div>
                            {asset.approved_revision_index === i && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}