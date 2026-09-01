import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Check, Globe, MapPin, Users } from 'lucide-react';

export function FactorySeedPanel({ project, onCreated, onUpdated }) {
  const [industry, setIndustry] = useState(project?.industry || '');
  const [subIndustry, setSubIndustry] = useState(project?.sub_industry || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedName, setSelectedName] = useState(project?.business_name || '');
  const [selectedDomain, setSelectedDomain] = useState(project?.domain_url || '');

  const isExisting = !!project;

  const handleSeed = async () => {
    if (!industry || !subIndustry) return;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('factorySeedGenerator', {
        industry,
        sub_industry: subIndustry,
        project_id: project?.id
      });
      if (onCreated) onCreated(res.data);
      if (onUpdated) onUpdated();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResearch = async () => {
    if (!project?.id) return;
    setLoading(true);
    setError(null);
    try {
      await base44.functions.invoke('factoryResearchIndustry', {
        project_id: project.id
      });
      if (onUpdated) onUpdated();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectName = async (name) => {
    setSelectedName(name);
    await base44.entities.FactoryProject.update(project.id, { business_name: name });
  };

  const handleSelectDomain = async (domain) => {
    setSelectedDomain(domain);
    await base44.entities.FactoryProject.update(project.id, { domain_url: domain });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isExisting ? 'Project Configuration' : 'New Website Project'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Industry inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., fitness, legal, real estate"
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="subIndustry">Sub-Industry</Label>
            <Input
              id="subIndustry"
              value={subIndustry}
              onChange={(e) => setSubIndustry(e.target.value)}
              placeholder="e.g., boutique gym, immigration law"
              disabled={loading}
            />
          </div>
        </div>

        <Button onClick={handleSeed} disabled={loading || !industry || !subIndustry}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isExisting ? 'Regenerate Seed' : 'Generate Seed'}
        </Button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Name options */}
        {project?.name_options?.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Users className="w-4 h-4" /> Business Name (pick one)</Label>
            <div className="grid grid-cols-2 gap-2">
              {project.name_options.map((name, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectName(name)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-sm transition-colors ${
                    selectedName === name
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  {name}
                  {selectedName === name && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Domain options */}
        {project?.domain_options?.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Globe className="w-4 h-4" /> Domain URL (pick one)</Label>
            <div className="grid grid-cols-2 gap-2">
              {project.domain_options.map((domain, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectDomain(domain)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-sm transition-colors ${
                    selectedDomain === domain
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  {domain}
                  {selectedDomain === domain && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Target locations */}
        {project?.target_locations?.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Target Locations</Label>
            <div className="flex flex-wrap gap-2">
              {project.target_locations.map((loc, i) => (
                <Badge key={i} variant="secondary">{loc}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Target audience */}
        {project?.target_audience && (
          <div className="space-y-1">
            <Label>Target Audience (ICP)</Label>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{project.target_audience}</p>
          </div>
        )}

        {/* Research button */}
        {project?.name_options?.length > 0 && !project.competitor_research && (
          <Button onClick={handleResearch} disabled={loading} variant="secondary" className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Research Industry & Competitors
          </Button>
        )}

        {/* Generate logos button */}
        {project?.competitor_research && !project.logos?.length && (
          <Button
            onClick={async () => {
              setLoading(true);
              try {
                await base44.functions.invoke('factoryBrandGenerator', { project_id: project.id });
                if (onUpdated) onUpdated();
              } catch (e) {
                setError(e.response?.data?.error || e.message);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Generate 10 Logos
          </Button>
        )}
      </CardContent>
    </Card>
  );
}