# syntax=docker/dockerfile:1

# Dependencies (shared by every stage).
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Repo + dev dependencies: runs migrations and maintenance scripts (scripts/db, scripts/dev).
FROM deps AS tools
COPY . .
CMD ["node", "scripts/db/migrate.ts"]

# Next.js standalone build. Supabase settings are read at runtime, never baked in.
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

# Minimal runtime image.
FROM node:24-alpine AS app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
