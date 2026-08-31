# 11 — Domains & Deployment

You own **thevisioncortex.com** and **autobuilderos.com**. This is how to wire them.

## thevisioncortex.com → Vision Cortex (the brain)

This is the public face of the brain — the app your users (and eventually clients) log into.

1. **Base44 custom domain:** Settings → Custom Domain → add `thevisioncortex.com` (and `www`). Base44 gives you DNS records (CNAME/A) to set at your registrar.
2. **Set the apex or www as primary.** Redirect the other to it.
3. **Update `index.html`:** the title/description still say "Xtreme Vision" — change to "Vision Cortex — Autonomous Council for Generational Wealth" (audit gap #38).
4. **Add `apple-touch-icon`:** iOS install uses a screenshot without it (audit gap #37). Add `<link rel="apple-touch-icon" href="/icon-192.png">` and ship a 192px PNG (the SVG won't do for iOS).
5. **Service worker (optional, later):** for offline PWA. Not urgent; the app needs the network to think anyway.

## autobuilderos.com → AutoBuilder OS (the hands)

This is the build factory — a Vercel-deployed service, not a Base44 app.

1. **Vercel project:** `autobuilder-os`. Deploy the three-endpoint service (chapter `02`).
2. **Vercel custom domain:** add `autobuilderos.com` in Vercel → Settings → Domains. Set DNS at your registrar per Vercel's instructions.
3. **Env vars (Vercel):** `GITHUB_PAT`, `VERCEL_API_TOKEN`, `AUTOBUILDER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. **The `AUTOBUILDER_API_KEY`:** also store as a Base44 secret so `autobuildAdvance` can call the service. The service validates the key on every request.
5. **Connect the new AutoBuilder:** today autobuilderos.com "does not have the new AutoBuilder connected yet" — deploying this service *is* the connection. Once live, Vision Cortex's `autobuildAdvance` function calls `https://autobuilderos.com/scaffold` etc.

## DNS quick reference

| Domain | Points to | Purpose |
|---|---|---|
| thevisioncortex.com | Base44 custom domain | the brain (app) |
| autobuilderos.com | Vercel | the hands (build API) |
| (per product) | Vercel | each launched Idea gets its own sub/domain |

## SSL

Both Base44 and Vercel provision SSL automatically. No manual certs needed.

## The naming discipline

- **Vision Cortex** = the brand, the brain, the council. Public-facing.
- **AutoBuilder OS** = the factory. Operator-facing (you + clients).
- **Shadow** = never a domain, never a brand. It is a capability, not a product.

When you clone for Chris (chapter `14`), Chris gets a Vision Cortex instance pointed at his own Supabase + his own AutoBuilder on his own Vercel. The domains stay yours; the tenants are config.
