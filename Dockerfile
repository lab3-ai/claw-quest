# Build stage - use bullseye for libssl1.1 compatibility with Prisma v5
FROM node:20-bullseye-slim AS builder

RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./

# Copy skill.md for API to serve
COPY skill.md ./

# Copy shared package
COPY packages/shared/ packages/shared/

# Copy API package
COPY apps/api/ apps/api/

# Install ALL dependencies (including devDependencies for building)
RUN pnpm install --no-frozen-lockfile

# Build shared package first
RUN pnpm --filter @clawquest/shared build

# Generate Prisma client
RUN cd apps/api && pnpm exec prisma generate

# Build API
RUN pnpm --filter @clawquest/api build

# Production stage - must also use bullseye for libssl1.1
FROM node:20-bullseye-slim AS runner

WORKDIR /app

# Copy everything needed from builder
COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/apps/api/dist/ apps/api/dist/
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/api/prisma/ apps/api/prisma/
COPY --from=builder /app/apps/api/node_modules/ apps/api/node_modules/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/skill.md ./

EXPOSE 3000

WORKDIR /app/apps/api

# Apply pending migrations on startup, then start server
CMD ["node", "dist/app.js"]
