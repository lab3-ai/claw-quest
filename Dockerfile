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

# Generate Prisma client
RUN cd apps/api && pnpm exec prisma generate

# Build API
RUN pnpm --filter @clawquest/api build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Copy everything needed from builder (node_modules with Prisma client, built packages)
COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/apps/api/dist/ apps/api/dist/
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/api/prisma/ apps/api/prisma/
COPY --from=builder /app/apps/api/node_modules/ apps/api/node_modules/
COPY --from=builder /app/package.json ./

EXPOSE 3000

WORKDIR /app/apps/api

CMD ["node", "dist/app.js"]
