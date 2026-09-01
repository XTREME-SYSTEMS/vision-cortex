import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Check, Globe, MapPin, Users, LayoutGrid } from 'lucide-react';

export function FactorySeedPanel({ project, onCreated, onUpdated }) {
  const [industry, setIndustry] = useState(project?.industry || '');
  const [subIndustry, setSubIndustry] = useState(project?.sub_industry || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedName, setSelectedName] = useState(project?.business_name || '');
  const [customName, setCustomName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(project?.domain_url || '');
  const [productType, setProductType] = useState(project?.product_type || 'marketing_site');

  const isExisting = !!project;

  const handleSeed = async () => {
    if (!industry || !subIndustry) return;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('factorySeedGenerator', {
        industry,
        sub_industry: subIndustry,
        product_type: productType,
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
        {/* Template type selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1"><LayoutGrid className="w-4 h-4" /> Website Template</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setProductType('marketing_site')}
              className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                productType === 'marketing_site' ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:bg-accent/50'
              }`}
            >
              <div className="font-medium">Marketing Site</div>
              <div className="text-xs text-muted-foreground">5-8 page brochure site</div>
            </button>
            <button
              type="button"
              onClick={() => setProductType('growth_os')}
              className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                productType === 'growth_os' ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:bg-accent/50'
              }`}
            >
              <div className="font-medium">Growth OS</div>
              <div className="text-xs text-muted-foreground">Full AI business OS: services, problems, locations, visual quote engine, SEO/AEO loop, 24-agent roster</div>
            </button>
          </div>
        </div>

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
            <Label className="flex items-center gap-1"><Users className="w-4 h-4" /> Business Name</Label>
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
            <div className="flex gap-2 pt-1">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Or type your own name"
                disabled={loading}
                onKeyDown={(e) => { if (e.key === 'Enter' && customName.trim()) handleSelectName(customName.trim()); }}
              />
              <Button
                onClick={() => customName.trim() && handleSelectName(customName.trim())}
                disabled={loading || !customName.trim()}
                variant="secondary"
              >
                Save
              </Button>
            </div>
            {selectedName && (
              <p className="text-xs text-muted-foreground">Selected: <span className="font-medium text-foreground">{selectedName}</span></p>
            )}
          </div>
        )}

        {/* Generate domains for custom name */}
        {project?.business_name && (
          <Button
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                await base44.functions.invoke('factoryDomainGenerator', { project_id: project.id });
                if (onUpdated) onUpdated();
              } catch (e) {
                setError(e.response?.data?.error || e.message);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            variant="secondary"
            className="w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Generate Domains for "{project.business_name}"
          </Button>
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

        {/* Generate Growth OS Website (stamps the repeatable template) */}
        {project?.brand_pack && !project.website_config && productType === 'growth_os' && (
          <Button
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                await base44.functions.invoke('factoryGrowthOSGenerator', { project_id: project.id });
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutGrid className="w-4 h-4" />}
            Stamp Growth OS Website
          </Button>
        )}
      </CardContent>
    </Card>
  );
}