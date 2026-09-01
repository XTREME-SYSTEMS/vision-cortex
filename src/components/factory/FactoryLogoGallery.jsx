import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, RefreshCw, Sparkles } from 'lucide-react';

export function FactoryLogoGallery({ project, onUpdated }) {
  const [loadingIdx, setLoadingIdx] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleSelect = async (index) => {
    setLoadingIdx(index);
    setError(null);
    try {
      await base44.functions.invoke('factoryBrandPack', {
        project_id: project.id,
        logo_index: index
      });
      if (onUpdated) onUpdated();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoadingIdx(null);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      await base44.functions.invoke('factoryBrandGenerator', {
        project_id: project.id,
        regenerate: true
      });
      if (onUpdated) onUpdated();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setRegenerating(false);
    }
  };

  const selectedIdx = project.selected_logo_index;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Logo Gallery — Pick One</CardTitle>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {project.logos?.map((logo, i) => (
            <div
              key={i}
              className={`relative group rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                selectedIdx === i
                  ? 'border-primary ring-2 ring-primary'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleSelect(i)}
            >
              <div className="aspect-square bg-white flex items-center justify-center p-2">
                <img
                  src={logo.url}
                  alt={`Logo ${i + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="p-1.5 bg-background">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{logo.style}</Badge>
                  {selectedIdx === i && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </div>
              {loadingIdx === i && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
        {selectedIdx >= 0 && (
          <p className="text-sm text-center mt-3 text-muted-foreground">
            <Sparkles className="w-4 h-4 inline mr-1" />
            Logo {selectedIdx + 1} selected — brand pack generated below
          </p>
        )}
      </CardContent>
    </Card>
  );
}