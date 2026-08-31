import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Small AI-assist button that sits to the right of a fill-in. Pass the user's
// rough text + optional context; onResult receives the expanded sentence.
export default function AIAssistButton({ text, context, onResult, className }) {
  const [loading, setLoading] = useState(false);
  const assist = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('aiAssist', { mode: 'expand', text, context });
      onResult?.(res.data?.expanded || '');
    } catch {
      // silent — user can retry
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      type="button"
      onClick={assist}
      disabled={loading}
      title="AI assist — expand my words"
      className={cn(
        'inline-flex items-center justify-center h-12 w-12 rounded-full border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0',
        className
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
    </button>
  );
}