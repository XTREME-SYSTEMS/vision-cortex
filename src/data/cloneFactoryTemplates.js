// Deep Clone Factory — enhanced pipeline stages for the DEEP clone system

export const DEEP_PIPELINE_STAGES = [
  { id: 1, key: 'queue', label: 'Queue', description: 'Add target URLs to the clone queue', icon: 'ListPlus' },
  { id: 2, key: 'clone', label: 'DEEP Clone', description: 'Fetch + extract + infer full system spec', icon: 'Copy' },
  { id: 3, key: 'validate', label: 'Validate', description: 'Visual + operational + content parity scoring', icon: 'ShieldCheck' },
  { id: 4, key: 'retry', label: 'Auto-Retry', description: 'Regenerate gaps until 100% parity', icon: 'RefreshCw' },
  { id: 5, key: 'library', label: 'Save Template', description: 'Save validated clone to template library', icon: 'Library' },
  { id: 6, key: 'rebrand', label: 'Rebrand', description: 'Scan for IP-sensitive assets, generate 10 revisions', icon: 'Palette' },
  { id: 7, key: 'provision', label: 'Provision', description: 'Deploy to Supabase, Vercel, Drive, Git', icon: 'Rocket' },
];

export const PARITY_DIMENSIONS = [
  { key: 'visual', label: 'Visual Parity', description: 'Layout, styles, components, responsive', weight: 0.3 },
  { key: 'operational', label: 'Operational Parity', description: 'Navigation, forms, APIs, auth, data flow', weight: 0.4 },
  { key: 'content', label: 'Content Parity', description: 'Text, media, metadata, SEO', weight: 0.3 },
];

export const PROVISION_TARGETS = [
  { key: 'supabase', label: 'Supabase', description: 'Database + auth backend', icon: 'Database' },
  { key: 'vercel', label: 'Vercel', description: 'Frontend deployment + URL', icon: 'Cloud' },
  { key: 'drive', label: 'Google Drive', description: 'File organization + assets', icon: 'HardDrive' },
  { key: 'git', label: 'Git Repository', description: 'Source code repository', icon: 'Github' },
];

export const REBRAND_SEVERITY = {
  critical: { label: 'Critical — must change', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  warning: { label: 'Warning — should change', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  info: { label: 'Info — optional', color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
};