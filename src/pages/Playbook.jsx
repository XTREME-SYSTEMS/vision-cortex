import React, { useEffect, useState } from 'react';
import { BookOpen, Loader2, FileText } from 'lucide-react';
import MarkdownContent from '@/components/MarkdownContent';

const CHAPTERS = [
  { file: '00-README.md', title: 'README — The Trio Playbook' },
  { file: '01-vision-cortex-architecture.md', title: '01 — Vision Cortex Architecture' },
  { file: '02-autobuilder-os.md', title: '02 — AutoBuilder OS' },
  { file: '03-cloud-browser-engine.md', title: '03 — Cloud Browser Engine' },
  { file: '04-trio-integration.md', title: '04 — Trio Integration' },
  { file: '05-agent-team-roster.md', title: '05 — Agent Team Roster' },
  { file: '06-shadow-operations-manual.md', title: '06 — Shadow Operations Manual' },
  { file: '07-prompt-library.md', title: '07 — Prompt Library' },
  { file: '08-off-platform-utilization.md', title: '08 — Off-Platform Utilization' },
  { file: '09-automation-247.md', title: '09 — 24/7 Automation Loop' },
  { file: '10-cost-efficiency.md', title: '10 — Cost Efficiency' },
  { file: '11-domains-deployment.md', title: '11 — Domains & Deployment' },
  { file: '12-security-rls-playbook.md', title: '12 — Security & RLS Playbook' },
  { file: '13-roadmap-90-days.md', title: '13 — 90-Day Execution Roadmap' },
  { file: '14-cloning-for-chris.md', title: '14 — Cloning the Trio for Chris' },
  { file: '15-autonomous-income-pipeline.md', title: '15 — Autonomous Income Pipeline' },
  { file: '16-destiny-engine-overview.md', title: '16 — The Destiny Engine (Overview)' },
  { file: '17-onboarding-quest.md', title: '17 — The Onboarding Quest' },
  { file: '18-morning-feed.md', title: '18 — The Morning Feed' },
  { file: '19-simulation-engine.md', title: '19 — The Simulation Engine' },
  { file: '20-build-approvals.md', title: '20 — The Build Approvals Flow' },
  { file: '21-autonomous-loop.md', title: '21 — The 24/7 Autonomous Loop' },
  { file: '22-integration-map.md', title: '22 — The Integration Map' },
  { file: '23-data-model.md', title: '23 — The Data Model' },
  { file: '24-build-order.md', title: '24 — The Build Order' },
  { file: '25-self-healing-protocol.md', title: '25 — The Self-Healing Protocol' },
  { file: '26-prompt-library-index.md', title: '26 — Prompt Library (Master Index)' },
  { file: '27-discovery-scrape-prompts.md', title: '27 — Discovery & Scrape Prompts' },
  { file: '28-validation-audit-prompts.md', title: '28 — Validation & Audit Prompts' },
  { file: '29-strategy-simulation-prompts.md', title: '29 — Strategy & Simulation Prompts' },
  { file: '30-build-generation-prompts.md', title: '30 — Build & Generation Prompts' },
  { file: '31-provisioning-launch-prompts.md', title: '31 — Provisioning & Launch Prompts' },
  { file: '32-monetization-marketing-prompts.md', title: '32 — Monetization & Marketing Prompts' },
  { file: '33-self-healing-hardening-prompts.md', title: '33 — Self-Healing & Hardening Prompts' },
  { file: '34-governance-doctrine-prompts.md', title: '34 — Governance & Doctrine Prompts' },
  { file: '35-prompt-engineering-meta.md', title: '35 — Prompt Engineering (Meta)' },
  { file: '36-vision-and-auto-recommendation.md', title: '36 — Vision & Auto-Recommendation Engine' },
  { file: '37-master-autonomous-build.md', title: '37 — The Master Autonomous Build' },
];

export default function Playbook() {
  const [active, setActive] = useState(CHAPTERS[0].file);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/playbook/${active}`)
      .then((r) => r.text())
      .then((t) => { setContent(t); setLoading(false); })
      .catch(() => { setContent('# Not found'); setLoading(false); });
  }, [active]);

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-6 lg:gap-8">
      <aside className="md:sticky md:top-20 md:self-start">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4" />
          <h2 className="font-display text-sm tracking-[0.18em] uppercase">Playbook</h2>
        </div>
        <nav className="space-y-0.5 max-h-[70vh] overflow-y-auto pr-1">
          {CHAPTERS.map((c) => {
            const on = c.file === active;
            return (
              <button
                key={c.file}
                onClick={() => setActive(c.file)}
                className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left text-[13px] leading-snug ${
                  on ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{c.title}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <article className="min-w-0 max-w-3xl">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <MarkdownContent content={content} />
        )}
      </article>
    </div>
  );
}