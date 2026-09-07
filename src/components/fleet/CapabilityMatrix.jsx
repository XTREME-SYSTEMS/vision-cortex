import React from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

export default function CapabilityMatrix({ engines, allCapabilities }) {
  if (!engines || engines.length === 0 || !allCapabilities || allCapabilities.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        No capability data available. Run a health check or scan engines to populate.
      </div>
    );
  }

  // Group capabilities by category
  const categories = {};
  allCapabilities.forEach(cap => {
    const prefix = cap.split('_')[0];
    if (!categories[prefix]) categories[prefix] = [];
    categories[prefix].push(cap);
  });

  return (
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/60">
            <th className="text-left py-2 px-2 sticky left-0 bg-background z-10 min-w-32">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Capability</span>
            </th>
            {engines.map(eng => (
              <th key={eng.engine_id} className="py-2 px-2 text-center min-w-24">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-medium truncate max-w-20">{eng.name}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">{eng.engine_id}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(categories).map(([prefix, caps]) => (
            <React.Fragment key={prefix}>
              <tr className="bg-muted/30">
                <td colSpan={engines.length + 1} className="py-1 px-2">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{prefix}</span>
                </td>
              </tr>
              {caps.map(cap => (
                <tr key={cap} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="py-1.5 px-2 sticky left-0 bg-background">
                    <span className="text-[11px] text-muted-foreground">{cap.replace(/_/g, ' ')}</span>
                  </td>
                  {engines.map(eng => {
                    const has = (eng.capabilities || []).includes(cap);
                    return (
                      <td key={eng.engine_id} className="py-1.5 px-2 text-center">
                        {has ? (
                          <Check className="w-3 h-3 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="w-3 h-3 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}