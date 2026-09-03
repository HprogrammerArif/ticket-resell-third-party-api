# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* variables are inlined into the browser bundle at build time.
# No defaults on purpose: a missing value must fail the build loudly rather than
# silently shipping a wrong websiteConfigId or app URL to production.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID
# Which Seatics deployment serves the maps. It must track the TN catalog we
# point at, NOT NODE_ENV — production Seatics does not know sandbox event IDs
# and returns an empty map.
#
# Deliberately has NO default. A default of "sandbox" is the dangerous one:
# on the day we switch to TN production, every other setting would flip while
# the map silently kept loading sandbox — no error, just an empty map. Better
# to state it explicitly on every build.
ARG NEXT_PUBLIC_MAPWIDGET_ENV
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID=$NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID \
    NEXT_PUBLIC_MAPWIDGET_ENV=$NEXT_PUBLIC_MAPWIDGET_ENV \
    NODE_ENV=production

RUN for v in NEXT_PUBLIC_APP_URL NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID NEXT_PUBLIC_MAPWIDGET_ENV; do \
      eval "val=\$$v"; \
      if [ -z "$val" ]; then echo "ERROR: required build-arg $v is empty" >&2; exit 1; fi; \
    done

# JWT_SECRET is required by @t3-oss/env-nextjs validation in next.config.ts.
# It is only needed to satisfy build-time validation — the real value is injected
# at runtime via env_file. Mounted as a build secret so it never enters layer history.
RUN --mount=type=secret,id=jwt_secret \
    JWT_SECRET="$(cat /run/secrets/jwt_secret)" \
    npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Next writes its data and prerender cache here at runtime. The COPY steps above
# run as root, so .next is root-owned and the unprivileged user cannot create
# the directory — which fails with EACCES on every request and silently
# disables unstable_cache and ISR. The pages still render; they just re-fetch
# everything, every time, spending the TicketNetwork and Ticketmaster budgets
# the caching exists to protect.
RUN mkdir -p /app/.next/cache && chown -R node:node /app/.next/cache

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
