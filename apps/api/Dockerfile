FROM node:23.11.0-slim AS builder
ARG GITHUB_TOKEN
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY .npmrc ./
RUN GITHUB_TOKEN=${GITHUB_TOKEN} pnpm install --frozen-lockfile

COPY . .
RUN pnpm turbo build --filter=@etf-canvas/api
RUN cd apps/api && npx prisma generate

FROM node:23.11.0-slim AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
ENV NODE_ENV=production
USER nestjs
CMD ["node", "dist/main.js"]
