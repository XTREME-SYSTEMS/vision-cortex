import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Phone, Send, Bot, FileText, Image, Briefcase, Search } from 'lucide-react';
import NumbersTab from '@/components/comms/NumbersTab';
import ComposerTab from '@/components/comms/ComposerTab';
import VoiceTab from '@/components/comms/VoiceTab';
import TemplatesTab from '@/components/comms/TemplatesTab';
import AssetsTab from '@/components/comms/AssetsTab';
import { Link } from 'react-router-dom';

const TABS = [
  { key: 'numbers', label: 'Phone Numbers', icon: Phone },
  { key: 'composer', label: 'Send Message', icon: Send },
  { key: 'voice', label: 'Voice', icon: Bot },
  { key: 'templates', label: 'Templates', icon: FileText },
  { key: 'assets', label: 'Creative Assets', icon: Image },
];

const LINKS = [
  { to: '/leads', label: 'Lead Scraper', icon: Search, desc: 'Find businesses by industry & location' },
  { to: '/crm', label: 'CRM Pipeline', icon: Briefcase, desc: 'Manage contacts & follow-ups' },
];

export default function Comms() {
  const [tab, setTab] = useState('numbers');

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-heading font-bold flex items-center gap-2">
          <Send className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Communications Hub
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Unified SMS, MMS, WhatsApp, Voice, and Email — powered by Xtreme Communications. Manage phone numbers, send messages, place AI calls, and organize templates & creative assets.
        </p>
      </div>

      {/* Quick links to lead gen + CRM */}
      <div className="grid grid-cols-2 gap-2">
        {LINKS.map(l => {
          const Icon = l.icon;
          return (
            <Link key={l.to} to={l.to} className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{l.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{l.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
                tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'numbers' && <NumbersTab />}
        {tab === 'composer' && <ComposerTab />}
        {tab === 'voice' && <VoiceTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'assets' && <AssetsTab />}
      </div>
    </div>
  );
}