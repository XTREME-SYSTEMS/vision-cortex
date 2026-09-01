import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, Mail, ExternalLink, Send, Loader2, CheckCircle2, Clock, Phone, MapPin, DollarSign } from 'lucide-react';

const scoreColor = (s) => s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-amber-500' : s >= 40 ? 'bg-orange-500' : 'bg-slate-400';
const statusBadge = (st) => {
  const map = {
    new: { variant: 'secondary', label: 'New' },
    researched: { variant: 'default', label: 'Researched' },
    responded: { variant: 'default', label: 'Responded' },
    followed_up: { variant: 'secondary', label: 'Followed Up' },
    closed: { variant: 'outline', label: 'Closed' },
  };
  const m = map[st] || map.new;
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

export default function OpportunityRow({ opp, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(opp.response_status === 'sent' || opp.response_status === 'followed_up');

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke('opportunityRespond', { opportunity_id: opp.id });
      if (res?.data?.sent) {
        setSent(true);
        onRefresh?.();
      } else if (res?.data?.error) {
        alert(res.data.error);
      }
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to send');
    }
    setSending(false);
  };

  const mailtoLink = opp.contact_email
    ? `mailto:${opp.contact_email}?subject=${encodeURIComponent(opp.response_subject || `Re: ${opp.title}`)}&body=${encodeURIComponent(opp.response_draft || '')}`
    : null;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className={`flex-shrink-0 w-2 h-12 rounded-full ${scoreColor(opp.score)}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{opp.source}</span>
            {statusBadge(opp.status)}
            {opp.follow_up_count > 0 && <Badge variant="outline" className="text-xs">{opp.follow_up_count} follow-up{opp.follow_up_count > 1 ? 's' : ''}</Badge>}
          </div>
          <h3 className="mt-1 font-medium leading-snug truncate">{opp.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {opp.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{opp.location}</span>}
            {opp.budget && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{opp.budget}</span>}
            {opp.contact_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{opp.contact_email}</span>}
            {opp.contact_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{opp.contact_phone}</span>}
            <span className="flex items-center gap-1 font-medium text-foreground">Score: {opp.score}</span>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 flex-shrink-0 mt-1 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-4 bg-muted/30">
          {/* Original posting link */}
          <div className="flex items-center gap-2 flex-wrap">
            <a href={opp.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> View original posting
            </a>
          </div>

          {/* Keywords */}
          {opp.keywords?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {opp.keywords.map((k, i) => (
                <Badge key={i} variant="outline" className="text-xs">{k}</Badge>
              ))}
            </div>
          )}

          {/* Research */}
          {opp.research_status === 'done' && opp.research ? (
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Preliminary Research</h4>
                <p className="text-sm leading-relaxed">{opp.research.summary}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {opp.research.what_they_need && (
                  <div><span className="font-medium">What they need:</span> <span className="text-muted-foreground">{opp.research.what_they_need}</span></div>
                )}
                {opp.research.estimated_value && (
                  <div><span className="font-medium">Est. value:</span> <span className="text-muted-foreground">{opp.research.estimated_value}</span></div>
                )}
                {opp.research.proposed_approach && (
                  <div className="sm:col-span-2"><span className="font-medium">Proposed approach:</span> <span className="text-muted-foreground">{opp.research.proposed_approach}</span></div>
                )}
                {opp.research.competitive_angle && (
                  <div className="sm:col-span-2"><span className="font-medium">Our angle:</span> <span className="text-muted-foreground">{opp.research.competitive_angle}</span></div>
                )}
                {opp.research.services_we_can_offer?.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="font-medium">Services we can offer:</span>
                    <div className="mt-1 flex gap-1.5 flex-wrap">
                      {opp.research.services_we_can_offer.map((s, i) => <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : opp.research_status === 'pending' ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4" /> Research in progress…</div>
          ) : null}

          {/* Response draft */}
          {opp.response_draft && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Draft Response Email</h4>
                {sent ? (
                  <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Sent</Badge>
                ) : opp.contact_email ? (
                  <Button size="sm" onClick={handleSend} disabled={sending}>
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Approve & Send
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">No email found — check posting</span>
                )}
              </div>
              <div className="rounded-md border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Subject: {opp.response_subject || `Re: ${opp.title}`}</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{opp.response_draft}</p>
              </div>
              {mailtoLink && !sent && (
                <a href={mailtoLink} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <Mail className="w-3 h-3" /> Or open in your email client
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}