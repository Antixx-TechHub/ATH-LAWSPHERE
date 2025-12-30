# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspace=apps/web

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source files
COPY . .

# Generate Prisma client
WORKDIR /app/apps/web
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner  
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install OpenSSL for Prisma (required on slim/debian)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy package files for runtime
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/server.js ./server.js

# Copy Next.js build output (non-standalone - needs node_modules)
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/prisma ./prisma

# Copy node_modules - from root (hoisted) AND apps/web if exists
COPY --from=builder /app/node_modules ./node_modules

# Validate build output exists
RUN echo "=== Validating build ===" && \
    ls -la /app/.next/ && \
    echo "=== .next folder exists ===" && \
    ls -la /app/node_modules/next/dist/ | head -5 && \
    echo "=== next module exists ==="

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

# Railway sets PORT dynamically, typically 8080
EXPOSE 8080

# Default port (Railway overrides this)
ENV PORT=8080

# Run directly without shell script to simplify debugging
CMD ["node", "server.js"]
