# Build stage
FROM node:20-slim AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./

# Copy shared package
COPY packages/shared/ packages/shared/

# Copy API package
COPY apps/api/ apps/api/

# Install ALL dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Build shared package first
RUN pnpm --filter @clawquest/shared build

# Generate Prisma client (use pnpm exec to use pinned v5, not npx which resolves to v7)
RUN cd apps/api && pnpm exec prisma generate

# Build API
RUN pnpm --filter @clawquest/api build

# Production stage
FROM node:20-slim AS runner

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./

# Copy shared (with built dist/)
COPY --from=builder /app/packages/shared/ packages/shared/

# Copy API package.json + prisma
COPY apps/api/package.json apps/api/
COPY apps/api/prisma/ apps/api/prisma/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Re-generate Prisma client in prod image
RUN cd apps/api && pnpm exec prisma generate

# Copy built API output
COPY --from=builder /app/apps/api/dist/ apps/api/dist/

EXPOSE 3000

WORKDIR /app/apps/api

# Run migrations then start
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/app.js"]
