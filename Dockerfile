# Railway Dockerfile - builds the web app
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for the monorepo
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/

# Copy prisma schema BEFORE npm ci so postinstall can find it
COPY apps/web/prisma ./apps/web/prisma

RUN npm ci

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client and build
WORKDIR /app/apps/web
RUN npx prisma generate
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create startup script that logs environment variables
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "=== Environment Variables Debug ===" ' >> /app/start.sh && \
    echo 'echo "DATABASE_URL set: $(test -n \"$DATABASE_URL\" && echo YES || echo NO)"' >> /app/start.sh && \
    echo 'echo "PGHOST: $PGHOST"' >> /app/start.sh && \
    echo 'echo "NODE_ENV: $NODE_ENV"' >> /app/start.sh && \
    echo 'echo "All env vars: $(env | grep -v SECRET | grep -v PASSWORD | grep -v KEY | head -20)"' >> /app/start.sh && \
    echo 'echo "===================================" ' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the server - environment variables are injected at runtime by Railway
CMD ["/app/start.sh"]
