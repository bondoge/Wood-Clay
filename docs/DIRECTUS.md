# Directus (catalogue curation admin)

Phase 2 of the SQLite → Postgres migration (see `docs/RESTORE.md` for Phase 1).
Directus runs on the server as the `directus` service in `docker-compose.yml`,
pointed at the same Postgres the site will eventually read from. The site
itself still reads the old SQLite file until a later phase rewires
`db/client.ts` — this is curation infrastructure running in parallel, not a
website change.

Local dev instance lives outside this repo at
`D:\Wood_Clay\woodclay_web\directus-admin` (plain `npm install` of
`directus@12.1.1`, run against the shared SQLite file). The server runs the
same Directus version via the official Docker image, against Postgres.

## Why it's on its own port, not a URL path

The admin is reachable at `https://admin.woodclay.ru/` — a dedicated nginx
`server` block for that subdomain (Let's Encrypt cert, HTTP→HTTPS redirect),
proxying 1:1 to the `directus` container on `127.0.0.1:8055`, no path
rewriting. Not `/admin/` on the main site's domain. (Before the subdomain +
cert existed, this was `http://161.104.44.9:8080/` — same nginx pattern, just
a bare IP:port instead of a real domain, since a cert needs a domain name.)

That was the first attempt, and it doesn't work: Directus's admin SPA isn't
built to be served from a URL sub-path. Its static assets are served at a
fixed `/assets/...`, unaffected by `PUBLIC_URL`, while its client-side routes
(e.g. the first-run `/setup` redirect) are matched *against* `PUBLIC_URL`'s
path. Stripping the `/admin` prefix in nginx (so assets resolve) breaks route
matching (`/setup` 404s); preserving it (so routes resolve) breaks asset
requests (a `.js` file request falls through to the SPA-fallback and comes
back as `text/html`, which the browser then refuses to execute as a module
script). No rewrite reconciles both — the fix is to give it its own origin
instead, where `PUBLIC_URL` has no path component and nothing needs stripping
either way.

## Security TODOs — do not lose track of these

- **HTTPS is on (`admin.woodclay.ru`, 2026-08-10) — `ADMIN_PASSWORD` rotation
  is still outstanding.** It's still the original throwaway value in the
  server `.env`, not reused anywhere else. Rotate it before any real customer
  data exists anywhere on the site.
- **Directus currently reuses the `woodclay_app` Postgres user** — the same
  role the site will eventually read through — rather than a dedicated
  least-privilege role of its own. Acceptable for now (small project, sole
  operator, no customer data yet); split it into its own role with
  narrower grants later, before this stops being a single-operator setup.
- **Phase 4 (accounts): `COOKIE_SECURE` must flip to `true` the moment HTTPS
  lands**, alongside the admin-login switch above — it's `false` right now
  because a `Secure`-flagged cookie is silently dropped by the browser over
  plain HTTP, which would break login entirely. See `.env.example`'s
  `AUTH_SECRET`/`COOKIE_SECURE` block. **No real customer registers on this
  site until HTTPS + `COOKIE_SECURE=true` are both on** — until then, every
  password created here is throwaway, same as `ADMIN_PASSWORD` above.
  `AUTH_SECRET` itself doesn't need rotating at that point, just a look
  alongside the other HTTP→HTTPS flags.
- **The `woodclay_app` Postgres password was accidentally printed into a
  local terminal session during Phase 4** (a redaction bug that missed
  `DATABASE_URL` embedding it, distinct from `POSTGRES_PASSWORD` itself).
  Treat it as compromised — rotate it (`ALTER ROLE`, then update the
  server's `.env` and your own local `.env`/`DATABASE_URL`) whenever
  convenient. Not urgent — the tunnel is localhost-only and the server is
  SSH-key-gated — but shouldn't sit indefinitely.

## Extensions

Two custom extensions (built locally, `dist/` is git-ignored — `directus-admin`
has no git remote either, so nothing here reaches the server via `git pull`)
plus one marketplace extension are deployed by copying the runtime files
directly into `/opt/woodclay-directus-extensions/` on the server, which is
mounted read-only to `/directus/extensions` in the container:

| Extension | Type | What it needs on the server |
|---|---|---|
| `first-image-thumbnail` | display | `package.json` + `dist/` |
| `source-images-gallery` | interface | `package.json` + `dist/` |
| `directus-extension-super-table` | layout | `package.json` + `index.js` (self-contained, no `node_modules`) |

None need `src/`, `node_modules/`, or `tsconfig.json` at runtime. Restart the
`directus` container after copying so it rescans `EXTENSIONS_PATH`.

## Reproducing the local config on the server

`directus-admin/scripts/configure.mjs` is idempotent and talks only to the
Directus REST API — collections, read-only WB-synced fields, the `style`
dropdown, boolean-toggle fields, the `first-image-thumbnail` display, and the
default curation-queue view (`style_reviewed = false`, sorted by
`style_confidence`). Run it from a local machine pointed at the server
instance by overriding its `.env` lookups for that one run:

```bash
PUBLIC_URL=https://admin.woodclay.ru/ \
ADMIN_EMAIL=<server admin email> \
ADMIN_PASSWORD=<server admin password> \
node scripts/configure.mjs
```

One thing it does **not** cover, because it isn't recorded in any file — the
`source-images-gallery` interface assignment (applied by hand in the UI
locally, likely on `own_images`). Reapply it by hand on the server too.
