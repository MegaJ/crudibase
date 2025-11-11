# Frontend Dockerfile for Crudibase React App
FROM node:22-alpine AS builder

# Install build dependencies for better-sqlite3 (needed by backend workspace)
# These are only in builder stage and won't be in final image
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root package.json and workspace configs
COPY package*.json ./
COPY src/frontend/package*.json ./src/frontend/
COPY src/backend/package*.json ./src/backend/

# Install all dependencies (root + both workspaces)
RUN npm ci

# Copy scripts directory (needed for check-node-version.js during build)
COPY scripts ./scripts

# Copy frontend source code
COPY src/frontend ./src/frontend

# Build the React app
WORKDIR /app/src/frontend
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY src/frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built React app to nginx html directory
COPY --from=builder /app/src/frontend/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

# Expose port 3000 (to match dev server)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
