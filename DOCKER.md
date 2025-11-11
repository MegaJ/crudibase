# Docker Quick Start

This guide helps you quickly test and deploy Crudibase using Docker.

## Prerequisites

- Docker Desktop installed
- Docker Compose (included with Docker Desktop)

## Quick Start - Production Build

Test the production build locally:

```bash
# 1. Build the images
docker-compose build

# 2. Start the containers
docker-compose up

# 3. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/api/health

# 4. Stop containers (Ctrl+C, then)
docker-compose down
```

## Development with Hot Reload

For local development with automatic code reloading:

```bash
# Start dev environment
docker-compose -f docker-compose.dev.yml up

# Stop (Ctrl+C, then)
docker-compose -f docker-compose.dev.yml down
```

## Environment Variables

Before deploying to production, set your environment variables:

```bash
# Copy example
cp .env.example .env

# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env and paste the generated secret
```

**Important**: Never commit `.env` to git - it's already in `.gitignore`.

## Useful Commands

```bash
# Build specific service
docker-compose build backend
docker-compose build frontend

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (WARNING: deletes database)
docker-compose down -v

# Check running containers
docker-compose ps

# Execute command in running container
docker exec -it crudibase-backend sh
docker exec -it crudibase-frontend sh
```

## Troubleshooting

### Port Already in Use

If you see "port is already allocated":

```bash
# Find what's using the port
lsof -i :3000
lsof -i :3001

# Stop the conflicting process or change ports in docker-compose.yml
```

### Build Fails

```bash
# Clean rebuild (no cache)
docker-compose build --no-cache

# Remove all containers and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Database Issues

```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up
```

## Next Steps

See [docs/deployment.md](docs/deployment.md) for full deployment guide to DigitalOcean.

## Architecture

- **Backend**: Node.js 22 Alpine + Express + SQLite + better-sqlite3
- **Frontend**: Nginx Alpine + React build (Vite)
- **Database**: SQLite with Docker volume for persistence
- **Network**: Bridge network for inter-container communication

## File Structure

```
crudibase/
├── docker-compose.yml          # Production configuration
├── docker-compose.dev.yml      # Development configuration
├── .dockerignore               # Files excluded from Docker builds
├── .env.example                # Environment variable template
├── src/
│   ├── backend/
│   │   └── Dockerfile          # Backend container
│   └── frontend/
│       ├── Dockerfile          # Frontend container
│       └── nginx.conf          # Nginx configuration
└── docs/
    └── deployment.md           # Full deployment guide
```

## Production Deployment

For production deployment to DigitalOcean, see the comprehensive guide:

**[docs/deployment.md](docs/deployment.md)**

Options covered:

1. **DigitalOcean App Platform** (easiest, $5-12/month)
2. **Docker Droplet** (most flexible, $5/month)
3. **SSL with Cloudflare or Let's Encrypt**
4. **Monitoring and backups**
