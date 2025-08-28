# Thaigen EMO Social — Cloudflare Pages + D1 (MVP)


## 1) Deploy (Cloudflare Pages)
1. Create a new **Pages** project → Framework preset: *None*.
2. Upload this folder. Ensure `public/` is the build output directory (or simply upload as-is where `/public` is root). If using Git, set output dir to `/public`.
3. Enable **Pages Functions**: place `functions/` at repo root (already). Pages will detect and build.
4. In Pages → Settings → **Bindings**:
- **D1 Database**: bind as `DB` and attach your D1 instance.
- **Environment Variables**: `JWT_SECRET` (long random), `MIGRATE_TOKEN` (one-time token), `RPM_BASE` e.g. `0.8`.
5. Run migrations (one time): open
`https://YOUR-PAGES-DOMAIN/api/admin/migrate?token=MIGRATE_TOKEN`
→ should return `{ ok: true }`.
6. Open the site → Register → Post → Enjoy EMO feed.


### Local Dev (optional)
```bash
npm i
npm run dev
# In another terminal run migrations locally:
npm run migrate