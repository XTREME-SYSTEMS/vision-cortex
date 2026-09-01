import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, MessageCircle, Heart, Repeat2, Send } from 'lucide-react';

const PLATFORM_ICONS = {
  instagram: Heart,
  tiktok: Send,
  twitter: Repeat2,
  linkedin: MessageCircle,
  facebook: MessageCircle
};

const PLATFORM_COLORS = {
  instagram: 'bg-pink-100 text-pink-700',
  tiktok: 'bg-gray-100 text-gray-700',
  twitter: 'bg-blue-100 text-blue-700',
  linkedin: 'bg-indigo-100 text-indigo-700',
  facebook: 'bg-blue-100 text-blue-700'
};

export function FactoryContentList({ project, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  const posts = project.viral_content || [];
  const platforms = [...new Set(posts.map((p) => p.platform))];
  const filtered = filter === 'all' ? posts : posts.filter((p) => p.platform === filter);

  const handleRegenerate = async () => {
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
          <CardTitle className="text-lg">Viral Content ({posts.length} posts)</CardTitle>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Platform filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === 'all' ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/50'
            }`}
          >
            All ({posts.length})
          </button>
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === p ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/50'
              }`}
            >
              {p} ({posts.filter((x) => x.platform === p).length})
            </button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
          {filtered.map((post, i) => {
            const Icon = PLATFORM_ICONS[post.platform] || MessageCircle;
            return (
              <div key={i} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${PLATFORM_COLORS[post.platform] || ''}`}>
                      <Icon className="w-3 h-3" /> {post.platform}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{post.type}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{post.best_post_time}</span>
                </div>
                <p className="text-sm font-medium">{post.hook}</p>
                <p className="text-sm text-muted-foreground">{post.body}</p>
                <p className="text-sm font-medium text-primary">{post.cta}</p>
                <div className="flex flex-wrap gap-1">
                  {post.hashtags?.map((tag, j) => (
                    <span key={j} className="text-xs text-blue-600">{tag}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}