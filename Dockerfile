# ---- deps: install dependencies only (cached layer) ----
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the Next.js app ----
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time-only placeholder: catalog pages are force-dynamic (never
# statically generated), but Next still imports the route module during
# `next build` to read its config, and db/client.ts throws immediately if
# these are unset — so they just need to be non-empty, not real, reachable
# values: pg.Pool connects lazily, so no query ever runs during the build.
# These ENVs do not carry into the runner stage.
ENV PGHOST=placeholder
ENV PGPORT=5432
ENV PGDATABASE=placeholder
ENV PGUSER=placeholder
ENV PGPASSWORD=placeholder
RUN npm run build

# ---- runner: minimal production image ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
