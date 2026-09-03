# syntax=docker/dockerfile:1.7

# ---- deps: install production dependencies only ----
# NOTE: the prisma CLI is a runtime dependency (not devDependency) so that the
# one-shot `migrate` service can run `prisma migrate deploy` from this image.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- build: full deps, generate Prisma client, compile TypeScript ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# tini reaps zombies and forwards signals correctly (handles graceful SIGTERM/SIGINT)
RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# The uploads directory must exist in the image, owned by the user the
# container runs as. Docker seeds an empty named volume from the image path on
# first mount and takes its ownership from there — without this the mount point
# is created root-owned and the unprivileged `node` user cannot write to it,
# which fails an upload with EACCES and no obvious cause.
RUN mkdir -p /app/uploads/banners && chown -R node:node /app/uploads

USER node
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server.js"]
