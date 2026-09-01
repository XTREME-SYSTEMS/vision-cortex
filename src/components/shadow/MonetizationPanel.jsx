import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, DollarSign, Zap, ExternalLink, RefreshCw, CreditCard,
  Rocket, Mail, Globe, Megaphone, TrendingUp, Lightbulb, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MonetizationPanel() {
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const createProducts = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('shadowCreateStripeProducts', {});
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (e) {
      setError(e.message || 'Failed to create Stripe products');
    }
    setCreating(false);
  };

  const paymentLinks = (results?.results || []).filter((r) => r.payment_link);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-emerald-600" /> Monetization — Path to Money Now
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Create Stripe products & payment links for every queued project. Share links, get paid, see revenue flow.
        </p>
      </div>

      {/* Create Products Button */}
      <Card className="p-4 bg-gradient-to-br from-emerald-500/10 via-card to-card border-emerald-500/20">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" /> Create Stripe Products + Payment Links
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Generates a $29 product + checkout link for every Shadow-strategized project. Test mode — use card <span className="font-mono bg-muted px-1.5 py-0.5 rounded">4242 4242 4242 4242</span> to pay.
            </p>
          </div>
          <Button
            size="lg"
            onClick={createProducts}
            disabled={creating}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {creating ? 'Creating...' : 'Create Products'}
          </Button>
        </div>

        {error && (
          <p className="text-xs text-rose-600 mt-2">⚠ {error}</p>
        )}

        {results && !error && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-600 font-medium">
              {results.created} products created, {results.total} total projects processed
            </span>
          </div>
        )}
      </Card>

      {/* Payment Links */}
      {paymentLinks.length > 0 && (
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Active Payment Links — Click to Test Pay</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {paymentLinks.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{r.payment_link}</p>
                </div>
                <a href={r.payment_link} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                    <ExternalLink className="w-3 h-3" /> Pay
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* How to See Money NOW */}
      <Card className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Lightbulb className="w-3 h-3" /> How to See Money Come In Now
        </p>
        <div className="space-y-2">
          {[
            { n: 1, text: 'Click "Create Products" above — generates Stripe products + payment links for all projects', done: results?.created > 0 },
            { n: 2, text: 'Click any "Pay" button — opens a real Stripe checkout page', done: false },
            { n: 3, text: 'Pay with test card 4242 4242 4242 4242 (any future expiry, any CVC)', done: false },
            { n: 4, text: 'Refresh the Performance Log below — actual revenue appears instantly', done: false },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-2 text-xs">
              <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold',
                step.done ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground')}>
                {step.done ? '✓' : step.n}
              </div>
              <p className={cn('pt-0.5', step.done && 'text-muted-foreground line-through')}>{step.text}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* What Else We Can Build */}
      <Card className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Rocket className="w-3 h-3" /> What Else We Can Build in Shadow
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { icon: Globe, label: 'Auto-Register Domains', desc: 'Buy domains + configure DNS per project' },
            { icon: Mail, label: 'Auto-Build Email Sequences', desc: 'Onboarding + nurture + upsell flows' },
            { icon: Megaphone, label: 'Auto-Create Ad Campaigns', desc: 'Google + Meta ads with AI targeting' },
            { icon: TrendingUp, label: 'Auto-Reinvest Profits', desc: 'Route revenue to highest-ROI next project' },
            { icon: CreditCard, label: 'Auto-Create Subscriptions', desc: 'Recurring pricing tiers per project' },
            { icon: Mail, label: 'Auto-Generate Investor Reports', desc: 'Performance reporting on schedule' },
            { icon: Globe, label: 'SEO Blog Content Engine', desc: 'Auto-generate + publish SEO articles' },
            { icon: Megaphone, label: 'Affiliate Program Builder', desc: 'Referral infrastructure per project' },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-2 p-2 rounded-lg border border-border/40 bg-card">
              <item.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 italic">
          Tell me which to build next and I'll install them into the Shadow pipeline.
        </p>
      </Card>
    </div>
  );
}