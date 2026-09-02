import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NavGroup({ label, icon: Icon, items, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const { pathname } = useLocation();

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center w-full px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
      >
        {Icon && <Icon className="w-3.5 h-3.5 mr-1.5" />}
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-0.5 mb-1.5 space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                  active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}