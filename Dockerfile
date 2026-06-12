# Use official Bun alpine image for a tiny footprint
FROM oven/bun:1.1.18-alpine AS builder

WORKDIR /app

# Copy root monorepo config
COPY package.json bun.lockb /app/
COPY drizzle.config.ts /app/

# Copy workspace package definitions first for caching
COPY shared/package.json /app/shared/
COPY backend/package.json /app/backend/
COPY integrations/shopify/package.json /app/integrations/shopify/

# Install dependencies (cached if package.jsons don't change)
RUN bun install --frozen-lockfile

# Copy all source files (excluding frontend)
COPY shared /app/shared
COPY backend /app/backend
COPY integrations/shopify /app/integrations/shopify

# Production runner stage
FROM oven/bun:1.1.18-alpine

WORKDIR /app

# Copy built artifacts and dependencies from builder stage
COPY --from=builder /app /app

# Expose Hono server port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Run Hono server natively via Bun
CMD ["bun", "run", "backend/src/index.ts"]
