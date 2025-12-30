# Self-contained Dockerfile for apps/web
# Use this with Railway Root Directory = "apps/web"

FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files
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

EXPOSE 8080

# Start with custom server
CMD ["node", "server.js"]

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

# Railway sets PORT dynamically, typically 8080
EXPOSE 8080

# Default port (Railway overrides this)
ENV PORT=8080

# Run directly without shell script to simplify debugging
CMD ["node", "server.js"]
# Cache bust Tue, Dec 30, 2025  9:41:30 PM
