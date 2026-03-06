FROM node:23.11.0-slim AS builder
ARG GITHUB_TOKEN
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY .npmrc ./
RUN GITHUB_TOKEN=${GITHUB_TOKEN} pnpm install --frozen-lockfile

COPY . .
RUN pnpm turbo build --filter=web

FROM node:23.11.0-slim AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
RUN chown -R nextjs:nodejs /app
USER nextjs
CMD ["node", "server.js"]
