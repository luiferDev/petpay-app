# Production Dockerfile for Identity Service
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy source code
COPY src/ ./src/
COPY templates/ ./templates/
COPY drizzle.config.json ./

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

RUN mkdir -p /home/nodejs && chown -R nodejs:nodejs /home/nodejs

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run directly with bun
CMD ["bun", "run", "src/infrastructure/http/server.ts"]
