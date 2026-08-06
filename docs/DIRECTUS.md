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

## Security TODOs — do not lose track of these

- **Admin login is plain HTTP for now.** `ADMIN_PASSWORD` in the server
  `.env` is a throwaway value, not reused anywhere else. The moment a domain
  and HTTPS exist for this server, switch the admin to HTTPS-only and rotate
  `ADMIN_PASSWORD` before any real customer data exists anywhere on the site.
- **Directus currently reuses the `woodclay_app` Postgres user** — the same
  role the site will eventually read through — rather than a dedicated
  least-privilege role of its own. Acceptable for now (small project, sole
  operator, no customer data yet); split it into its own role with
  narrower grants later, before this stops being a single-operator setup.

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
PUBLIC_URL=http://161.104.44.9/admin/ \
ADMIN_EMAIL=<server admin email> \
ADMIN_PASSWORD=<server admin password> \
node scripts/configure.mjs
```

One thing it does **not** cover, because it isn't recorded in any file — the
`source-images-gallery` interface assignment (applied by hand in the UI
locally, likely on `own_images`). Reapply it by hand on the server too.
