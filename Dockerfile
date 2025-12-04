# Simple Node.js image - no browser dependencies needed
FROM node:20-slim

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y \
    dumb-init \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create storage and log directories (both local and mounted paths)
RUN mkdir -p stories data logs /var/data/stories && \
    chown -R nodejs:nodejs stories data logs /var/data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
