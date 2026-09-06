import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Sparkles, FlaskConical, Users, Lightbulb, EyeOff, Copy, Rocket, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const actions = [
  { id: 'prediction', label: 'Prediction', icon: Sparkles, to: '/destiny', color: 'text-violet-500' },
  { id: 'simulation', label: 'Simulation', icon: FlaskConical, to: '/simulation', color: 'text-sky-500' },
  { id: 'council', label: 'Council Vote', icon: Users, to: '/council', color: 'text-emerald-500' },
  { id: 'suggestions', label: 'Suggestions', icon: Lightbulb, to: '/gaps', color: 'text-amber-500' },
  { id: 'shadow', label: 'Shadow', icon: EyeOff, to: '/shadow', color: 'text-slate-500' },
  { id: 'clone', label: 'Clone', icon: Copy, fn: 'shadowClone', color: 'text-indigo-500' },
  { id: 'autobuild', label: 'Auto Build', icon: Rocket, to: '/autonomous', color: 'text-rose-500' },
];

export default function SidebarActions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(null);

  const handleClick = async (a) => {
    if (a.to) {
      navigate(a.to);
    } else if (a.fn) {
      setLoading(a.id);
      try {
        const res = await base44.functions.invoke(a.fn, {});
        const data = res.data || res;
        toast({ title: `${a.label} triggered`, description: typeof data === 'string' ? data.substring(0, 120) : (data.message || data.summary || 'Complete') });
      } catch (e) {
        toast({ title: `${a.label} failed`, description: e.message, variant: 'destructive' });
      } finally {
        setLoading(null);
      }
    }
  };

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {actions.map((a) => (
        <button
          key={a.id}
          onClick={() => handleClick(a)}
          title={a.label}
          className="w-10 h-10 rounded-lg grid place-items-center hover:bg-muted transition-colors"
        >
          {loading === a.id ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <a.icon className={cn('w-5 h-5', a.color)} />
          )}
        </button>
      ))}
    </div>
  );
}