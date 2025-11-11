# Backend Dockerfile for Crudibase API
FROM node:22-alpine AS base

# Install build dependencies for better-sqlite3 (native module)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

WORKDIR /app

# Copy root package.json and workspace configs
COPY package*.json ./
COPY src/backend/package*.json ./src/backend/
COPY src/frontend/package*.json ./src/frontend/

# Install all dependencies (root + both workspaces)
# The prepare script will run but have no effect in Docker (no git hooks needed)
RUN npm ci

# Copy scripts directory (needed for check-node-version.js during build)
COPY scripts ./scripts

# Copy backend source code
COPY src/backend ./src/backend

# Build TypeScript
WORKDIR /app/src/backend
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/backend/package*.json ./src/backend/

# Copy node_modules from build stage (includes compiled better-sqlite3)
# npm workspaces install all modules at root, so we only need root node_modules
COPY --from=base /app/node_modules ./node_modules

# Copy built application
COPY --from=base /app/src/backend/dist ./src/backend/dist

# Create data directory for SQLite database
RUN mkdir -p /app/src/backend/data && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose backend port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the backend server
CMD ["node", "src/backend/dist/index.js"]
