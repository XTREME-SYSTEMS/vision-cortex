import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smartphone, Moon, FileCode, RefreshCw } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function FactoryWebsitePreview({ project, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const wc = project.website_config;

  const handleRegenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      await base44.functions.invoke('factoryWebsiteGenerator', { project_id: project.id });
      if (onUpdated) onUpdated();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    setLoading(true);
    setError(null);
    try {
      await base44.functions.invoke('factoryContentGenerator', { project_id: project.id });
      if (onUpdated) onUpdated();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Website Architecture
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Feature badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <Smartphone className="w-3 h-3" /> Responsive
          </Badge>
          {wc.has_dark_mode && (
            <Badge variant="secondary" className="gap-1">
              <Moon className="w-3 h-3" /> Dark Mode
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1">PWA Ready</Badge>
        </div>

        {/* Pages */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Pages ({wc.pages?.length})</Label>
          <div className="grid grid-cols-2 gap-2">
            {wc.pages?.map((page, i) => (
              <div key={i} className="border rounded-lg p-2">
                <p className="text-sm font-medium">{page.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{page.slug}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {page.sections?.map((s, j) => (
                    <Badge key={j} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Theme tokens preview */}
        {wc.theme_tokens && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Theme Tokens (Light + Dark)</Label>
            <div className="grid grid-cols-2 gap-3">
              {['light', 'dark'].map((mode) => (
                <div key={mode} className="border rounded-lg p-3">
                  <p className="text-xs font-medium mb-2 capitalize">{mode} Mode</p>
                  <div className="grid grid-cols-4 gap-1">
                    {['background', 'primary', 'accent', 'muted'].map((key) => {
                      const val = wc.theme_tokens[mode]?.[key];
                      return (
                        <div key={key} className="text-center">
                          <div
                            className="w-full h-8 rounded border"
                            style={{ backgroundColor: val || '#ccc' }}
                          />
                          <p className="text-xs mt-0.5">{key}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PWA config */}
        {wc.pwa && (
          <div className="border rounded-lg p-3 space-y-1">
            <Label className="text-sm font-medium">PWA Configuration</Label>
            <p className="text-xs"><span className="text-muted-foreground">Name:</span> {wc.pwa.name}</p>
            <p className="text-xs"><span className="text-muted-foreground">Short:</span> {wc.pwa.short_name}</p>
            <p className="text-xs"><span className="text-muted-foreground">Display:</span> {wc.pwa.display}</p>
            <div className="flex gap-2 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: wc.pwa.theme_color }} />
                <span className="text-xs">Theme</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: wc.pwa.background_color }} />
                <span className="text-xs">Background</span>
              </div>
            </div>
          </div>
        )}

        {/* Generate content button */}
        {!project.viral_content?.length && (
          <Button onClick={handleGenerateContent} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Generate 30 Viral Social Posts
          </Button>
        )}
      </CardContent>
    </Card>
  );
}