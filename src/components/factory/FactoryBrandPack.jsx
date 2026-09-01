import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Palette, RefreshCw } from 'lucide-react';

const ACCENT_PRESETS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#F97316'];

export function FactoryBrandPack({ project, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bp = project.brand_pack;

  const handleAccentChange = async (color) => {
    setLoading(true);
    setError(null);
    try {
      await base44.functions.invoke('factoryBrandPack', {
        project_id: project.id,
        logo_index: project.selected_logo_index,
        accent_color_override: color
      });
      if (onUpdated) onUpdated();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWebsite = async () => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Brand Pack
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Logo + colors */}
        <div className="flex gap-4 items-start">
          <div className="w-24 h-24 rounded-lg border bg-white flex items-center justify-center p-2 shrink-0">
            {bp.logo_url && <img src={bp.logo_url} alt="Selected logo" className="max-w-full max-h-full object-contain" />}
          </div>
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Primary', value: bp.primary_color },
                { label: 'Accent', value: bp.accent_color },
                { label: 'Background', value: bp.background_color },
                { label: 'Text', value: bp.text_color }
              ].map((c) => (
                <div key={c.label} className="text-center">
                  <div
                    className="w-full h-12 rounded-lg border"
                    style={{ backgroundColor: c.value }}
                  />
                  <p className="text-xs mt-1 text-muted-foreground">{c.label}</p>
                  <p className="text-xs font-mono">{c.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Accent color swatch */}
        <div className="space-y-2">
          <Label>Change Accent Color</Label>
          <div className="flex gap-2 flex-wrap">
            {ACCENT_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => handleAccentChange(color)}
                disabled={loading}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                  bp.accent_color?.toUpperCase() === color.toUpperCase()
                    ? 'border-primary ring-2 ring-primary'
                    : 'border-border'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <Input
              type="color"
              value={bp.accent_color || '#3B82F6'}
              onChange={(e) => handleAccentChange(e.target.value)}
              disabled={loading}
              className="w-8 h-8 p-0 border-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Typography */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Heading Font</Label>
            <p className="text-sm font-medium" style={{ fontFamily: bp.font_heading }}>
              {bp.font_heading}
            </p>
          </div>
          <div>
            <Label className="text-xs">Body Font</Label>
            <p className="text-sm" style={{ fontFamily: bp.font_body }}>
              {bp.font_body}
            </p>
          </div>
        </div>

        {/* Voice + tagline */}
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Brand Voice</Label>
            <p className="text-sm text-muted-foreground">{bp.voice}</p>
          </div>
          <div>
            <Label className="text-xs">Tagline</Label>
            <p className="text-sm font-medium italic">"{bp.tagline}"</p>
          </div>
          <div>
            <Label className="text-xs">Brand Story</Label>
            <p className="text-sm text-muted-foreground">{bp.brand_story}</p>
          </div>
        </div>

        {/* Generate website button */}
        {!project.website_config && (
          <Button onClick={handleGenerateWebsite} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Generate Website Architecture
          </Button>
        )}
      </CardContent>
    </Card>
  );
}