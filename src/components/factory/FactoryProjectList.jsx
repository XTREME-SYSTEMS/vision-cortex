import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText } from 'lucide-react';

const STAGE_LABELS = {
  seeded: 'Seeded',
  researched: 'Researched',
  branded: 'Branded',
  website_built: 'Website Built',
  content_generated: 'Content Ready',
  social_connected: 'Social AI Active',
  deployed: 'Deployed',
  failed: 'Failed'
};

const STAGE_COLORS = {
  seeded: 'bg-blue-100 text-blue-700',
  researched: 'bg-indigo-100 text-indigo-700',
  branded: 'bg-purple-100 text-purple-700',
  website_built: 'bg-pink-100 text-pink-700',
  content_generated: 'bg-orange-100 text-orange-700',
  social_connected: 'bg-green-100 text-green-700',
  deployed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700'
};

export function FactoryProjectList({ projects, selectedId, onSelect }) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Projects ({projects.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => onSelect(null)}
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto no-scrollbar">
          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No projects yet. Create one to get started.
            </p>
          )}
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedId === p.id
                  ? 'border-primary bg-accent'
                  : 'border-border hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium truncate">
                  {p.business_name || `${p.industry} / ${p.sub_industry}`}
                </p>
                <Badge className={`text-xs ${STAGE_COLORS[p.stage] || ''}`}>
                  {STAGE_LABELS[p.stage] || p.stage}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {p.domain_url || p.domain_options?.[0] || 'No domain yet'}
              </p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}