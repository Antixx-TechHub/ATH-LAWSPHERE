# Railway Dockerfile - builds the web app with custom server.js
# Using node:20-slim instead of alpine for better OpenSSL/Prisma compatibility

FROM node:20-slim AS deps
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

# Install dependencies for the monorepo
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/

# Copy prisma schema BEFORE npm ci so postinstall can find it
COPY apps/web/prisma ./apps/web/prisma

RUN npm ci

# Builder stage
FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma generate
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client and build Next.js
WORKDIR /app/apps/web
RUN npx prisma generate
RUN npm run build

# Runner stage - use slim for production too
FROM node:20-slim AS runner
WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copy the entire apps/web folder since we use custom server.js (not standalone)
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/server.js ./server.js
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/prisma ./prisma
COPY --from=builder /app/apps/web/next.config.js ./next.config.js

# Copy node_modules (needed for custom server.js and runtime)
COPY --from=builder /app/node_modules ./node_modules

# Validate build output exists
RUN echo "=== Validating build ===" && \
    ls -la /app/.next/ | head -10 && \
    test -f /app/.next/build-manifest.json && \
    echo "=== Build validated ==="

# Railway uses PORT env var - don't set a default, let Railway control it
# EXPOSE is informational only
EXPOSE 3000
EXPOSE 8080

# Don't set PORT - let Railway inject it
# ENV PORT=8080

# Start the custom server directly
CMD ["node", "server.js"]
