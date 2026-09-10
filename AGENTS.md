# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.

## Base44 Sandbox Runtime (docker-compose.base44.yml)

This repo contains two frontends; only one runs in the Base44 sandbox:

- **Next.js app (`src/app/`)** — the runnable app here. `npm run dev` = `next dev`, served on port 3000 via `docker-compose.base44.yml` (node:22-slim, source bind-mounted, `node_modules` in a named volume, live reload). This is what the preview shows.
- **Vite SPA (`index.html` → `src/main.jsx` → `src/App.jsx`)** — the "Xtreme Vision" product UI. It depends on the hosted Base44 backend (`@base44/sdk` auth/entities/functions) and on packages not declared in `package.json` (`react-router-dom`, `@tanstack/react-query`, `vite`, `@vitejs/plugin-react`). It cannot run standalone in this sandbox; it needs the Base44 CLI/backend. Leave it untouched.

### Environment / secrets
- Local placeholders live in `.env.base44-defaults` (loaded first by compose). Real external credentials are delivered via `/run/base44/app.env` (loaded last, so they always win) — never put user-supplied keys under compose `environment:`.
- Required for full functionality (optional for boot — the dashboard renders an empty state without them): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_GATEWAY_API_KEY` (chat only), `NEXT_PUBLIC_AI_GATEWAY_URL` (optional).

### Known fix applied
- `src/lib/supabase.ts`: `supabaseAdmin` is now created only when `SUPABASE_SERVICE_ROLE_KEY` is present. The service-role key is server-only and is not inlined into the client bundle, so the previous eager `createClient(url, '')` threw "supabaseKey is required" during client hydration. `supabaseAdmin` is never consumed in the codebase, so guarding it changes no behavior.

### Verify it works
- `docker compose -f docker-compose.base44.yml up -d`, then `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/` → 200, and the homepage shows "Your Apps / No apps yet".
