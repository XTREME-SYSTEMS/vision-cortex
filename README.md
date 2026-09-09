# Vision Cortex

Autonomous AI business operating system — self-hosted replica of the Base44 platform.

## Infrastructure
- **Frontend:** Vercel (Next.js + TypeScript + Tailwind)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Workers:** Railway (background services)
- **Data:** Google Drive
- **Version Control:** GitHub

## Getting Started
```bash
npm install
npm run dev
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://hjdsqjiqgqbsangtaxgu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Deployment
- Vercel: Auto-deploys from `main` branch
- Railway: Workers deployed from `main` branch
- Supabase: Database migrations via SQL editor