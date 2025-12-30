# Dockerfile for apps/web
# Build context is apps/web (Railway Root Directory setting)
# All COPY paths are relative to apps/web/
# Cache bust: 2025-12-30-v2

FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files (relative to apps/web)
COPY package.json ./

# Copy prisma schema BEFORE npm install (for postinstall hook)
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Generate Prisma client and build Next.js
RUN npx prisma generate
RUN npm run build

# Runner stage
FROM node:20-slim AS runner
WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copy built app
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/node_modules ./node_modules

# Validate build
RUN echo "=== Validating build ===" && \
    ls -la /app/.next/ | head -5 && \
    test -f /app/.next/build-manifest.json && \
    echo "=== Build OK ==="

# Default port (Railway overrides this)
ENV PORT=8080
EXPOSE 8080

# Run with custom server
CMD ["node", "server.js"]
