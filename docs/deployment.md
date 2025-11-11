# Deployment Guide

This guide covers deploying Crudibase to production using Docker and DigitalOcean.

## Table of Contents

- [Local Docker Testing](#local-docker-testing)
- [Deployment Options](#deployment-options)
- [Option 1: DigitalOcean App Platform (Easiest)](#option-1-digitalocean-app-platform-easiest)
- [Option 2: Docker Droplet (Most Flexible)](#option-2-docker-droplet-most-flexible)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Environment Variables](#environment-variables)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

---

## Local Docker Testing

### Prerequisites

- Docker Desktop installed (includes Docker Compose)
- Node.js 22 (for local development without Docker)

### Production Build Testing

Test the production build locally before deploying:

```bash
# 1. Build the images
docker-compose build

# 2. Start the containers
docker-compose up

# 3. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/api/health

# 4. Stop containers
docker-compose down

# 5. Clean up (removes volumes - database will be reset)
docker-compose down -v
```

### Development with Hot Reload

For local development with automatic code reloading:

```bash
# Start dev environment
docker-compose -f docker-compose.dev.yml up

# Stop dev environment
docker-compose -f docker-compose.dev.yml down
```

---

## Deployment Options

### Comparison Matrix

| Feature         | App Platform   | Docker Droplet |
| --------------- | -------------- | -------------- |
| Cost            | $5-12/month    | $5-6/month     |
| Setup Time      | 10 minutes     | 30-60 minutes  |
| Auto SSL        | ✅ Built-in    | Manual setup   |
| Auto Scaling    | ✅ Available   | Manual         |
| Git Integration | ✅ Auto-deploy | Manual         |
| Control         | Limited        | Full           |
| Best For        | Quick launch   | Custom config  |

---

## Option 1: DigitalOcean App Platform (Easiest)

**Recommended for**: Quick deployment, minimal DevOps experience

### Step 1: Push Code to GitHub

```bash
# Ensure latest code is pushed
git add .
git commit -m "feat: prepare for deployment"
git push origin main
```

### Step 2: Create App Platform App

1. Go to https://cloud.digitalocean.com/apps
2. Click **Create App**
3. Select **GitHub** as source
4. Authorize DigitalOcean to access your repository
5. Select your `crudibase` repository
6. Select `main` branch
7. Click **Next**

### Step 3: Configure Services

App Platform will auto-detect your configuration. Review and adjust:

**Backend Service:**

- Type: Web Service
- Dockerfile: `src/backend/Dockerfile`
- Port: 3001
- Health Check: `/api/health`

**Frontend Service:**

- Type: Web Service
- Dockerfile: `src/frontend/Dockerfile`
- Port: 3000

### Step 4: Set Environment Variables

Add these environment variables to the **backend service**:

```
NODE_ENV=production
JWT_SECRET=<generate-random-secret>
JWT_EXPIRES_IN=1h
DATABASE_PATH=/app/src/backend/data/crudibase.db
```

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Configure Resources

- **Plan**: Basic ($5/month per service = $10/month total)
- **Region**: Choose closest to your users

### Step 6: Deploy

1. Click **Create Resources**
2. Wait for build and deployment (5-10 minutes)
3. App Platform provides URLs:
   - Frontend: `https://crudibase-xxxxx.ondigitalocean.app`
   - Backend: `https://crudibase-backend-xxxxx.ondigitalocean.app`

### Step 7: Add Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `crudibase.com`)
3. Update DNS records as instructed
4. SSL certificate auto-provisioned via Let's Encrypt

**Done!** Your app is live with HTTPS.

---

## Option 2: Docker Droplet (Most Flexible)

**Recommended for**: Full control, learning DevOps, custom configurations

### Step 1: Create Docker Droplet

1. Go to https://cloud.digitalocean.com/droplets/new
2. Choose:
   - **Image**: Marketplace → Docker on Ubuntu 24.04
   - **Plan**: Basic ($5/month)
   - **Region**: Closest to users
   - **Authentication**: SSH Key (recommended) or Password
3. Click **Create Droplet**
4. Note the IP address (e.g., `123.45.67.89`)

### Step 2: Connect to Droplet

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Verify Docker is installed
docker --version
docker-compose --version
```

### Step 3: Transfer Code to Droplet

**Option A: Clone from Git (Recommended)**

```bash
# On droplet
cd /opt
git clone https://github.com/YOUR_USERNAME/crudibase.git
cd crudibase
```

**Option B: SCP from Local Machine**

```bash
# From your local machine
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude '.git' \
  ./ root@YOUR_DROPLET_IP:/opt/crudibase/
```

### Step 4: Configure Environment Variables

```bash
# On droplet
cd /opt/crudibase

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
JWT_EXPIRES_IN=1h
DATABASE_PATH=/app/src/backend/data/crudibase.db
EOF

# Secure the .env file
chmod 600 .env
```

Generate JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Build and Run Containers

```bash
# Build images
docker-compose build

# Start containers in detached mode
docker-compose up -d

# Check logs
docker-compose logs -f

# Verify containers are running
docker-compose ps
```

Access your app:

- Frontend: `http://YOUR_DROPLET_IP:3000`
- Backend: `http://YOUR_DROPLET_IP:3001/api/health`

### Step 6: Setup Firewall

```bash
# Allow HTTP, HTTPS, and SSH
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Verify
ufw status
```

### Step 7: Setup Reverse Proxy (Production)

For production, use nginx as a reverse proxy to:

- Serve both frontend and backend on port 80/443
- Enable SSL with Let's Encrypt

**Create nginx reverse proxy config:**

```bash
# Install nginx on host (not in container)
apt update && apt install nginx

# Create config
cat > /etc/nginx/sites-available/crudibase << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/crudibase /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## SSL/HTTPS Setup

### Option A: Cloudflare (Easiest - Recommended)

**Pros**: Free SSL, CDN, DDoS protection, no server config needed

**Steps:**

1. **Add Domain to Cloudflare**
   - Sign up at https://cloudflare.com (free tier)
   - Add your domain
   - Update nameservers at your domain registrar

2. **Configure DNS**
   - Add A record: `@` → `YOUR_DROPLET_IP`
   - Add A record: `www` → `YOUR_DROPLET_IP`

3. **Configure SSL Mode**
   - Go to SSL/TLS → Overview
   - Set mode to **Full** (or **Full (strict)** if using Let's Encrypt on droplet)

4. **Done!** Cloudflare handles SSL automatically
   - Access: `https://yourdomain.com`

**Cloudflare Origin Certificate (Optional - Extra Security):**

```bash
# On droplet - create nginx SSL config with Cloudflare origin cert
# Follow: https://developers.cloudflare.com/ssl/origin-configuration/origin-ca
```

### Option B: Let's Encrypt with Certbot

**Pros**: Free, standard, full control

**Prerequisites**: Domain pointing to your droplet IP

**Steps:**

```bash
# On droplet
# Install Certbot
apt update
apt install certbot python3-certbot-nginx

# Obtain certificate (interactive)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect HTTP to HTTPS (recommended)

# Verify auto-renewal
certbot renew --dry-run

# Done! Certificate auto-renews every 90 days
```

Access: `https://yourdomain.com`

---

## Environment Variables

### Required Variables

| Variable         | Description                | Example                              |
| ---------------- | -------------------------- | ------------------------------------ |
| `NODE_ENV`       | Environment mode           | `production`                         |
| `JWT_SECRET`     | Secret key for JWT signing | `abc123...` (32+ chars)              |
| `JWT_EXPIRES_IN` | JWT token expiration       | `1h`, `7d`                           |
| `DATABASE_PATH`  | SQLite database file path  | `/app/src/backend/data/crudibase.db` |

### Generating Secrets

```bash
# Strong random secret
openssl rand -hex 32

# Or with Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Setting Variables

**Docker Compose:**

```yaml
# docker-compose.yml
environment:
  - JWT_SECRET=${JWT_SECRET}
```

**App Platform:**

1. Go to app settings → Environment Variables
2. Add variables to backend service
3. Encrypt sensitive values

---

## Monitoring and Maintenance

### Health Checks

```bash
# Backend health
curl http://localhost:3001/api/health

# Frontend health
curl http://localhost:3000
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart backend only
docker-compose restart backend

# Stop and start (recreate containers)
docker-compose down && docker-compose up -d
```

### Update Application

```bash
# Pull latest code
cd /opt/crudibase
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d

# Verify
docker-compose ps
docker-compose logs -f
```

### Backup Database

```bash
# Create backup
docker exec crudibase-backend cp /app/src/backend/data/crudibase.db /app/src/backend/data/backup-$(date +%Y%m%d).db

# Copy to host
docker cp crudibase-backend:/app/src/backend/data/backup-$(date +%Y%m%d).db ./

# Download to local machine
scp root@YOUR_DROPLET_IP:/opt/crudibase/backup-*.db ./backups/
```

### Automated Backups

```bash
# Create backup script
cat > /opt/crudibase/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/crudibase/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker exec crudibase-backend sqlite3 /app/src/backend/data/crudibase.db ".backup '/app/src/backend/data/backup-$DATE.db'"
docker cp crudibase-backend:/app/src/backend/data/backup-$DATE.db $BACKUP_DIR/
# Keep only last 7 days
find $BACKUP_DIR -name "backup-*.db" -mtime +7 -delete
EOF

chmod +x /opt/crudibase/scripts/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/crudibase/scripts/backup.sh") | crontab -
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check container status
docker-compose ps

# View logs for errors
docker-compose logs backend
docker-compose logs frontend

# Common fix: rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Errors

```bash
# Check database file exists
docker exec crudibase-backend ls -lh /app/src/backend/data/

# Check permissions
docker exec crudibase-backend stat /app/src/backend/data/crudibase.db

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

### Node Version Mismatch

```bash
# Verify Dockerfile uses Node 22
grep "FROM node" src/backend/Dockerfile src/frontend/Dockerfile

# Should show: FROM node:22-alpine
```

### Port Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Or with netstat
netstat -tulpn | grep :3000

# Kill process or change port in docker-compose.yml
```

### Frontend Can't Connect to Backend

**In Development:**

- Check `VITE_API_URL` in frontend config
- Should be `http://localhost:3001`

**In Production:**

- nginx should proxy `/api/` to backend
- Check nginx config: `cat /etc/nginx/sites-available/crudibase`
- Test proxy: `curl http://localhost/api/health`

### SSL Certificate Issues

```bash
# Check certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Renew manually
certbot renew

# Check auto-renewal timer
systemctl status certbot.timer
```

---

## Performance Optimization

### Enable HTTP/2

```nginx
# In nginx config
listen 443 ssl http2;
```

### Add Caching Headers

Already configured in `src/frontend/nginx.conf`:

- Static assets: 1 year cache
- HTML: no-cache (for SPA routing)

### Monitor Resource Usage

```bash
# Container stats
docker stats

# Disk usage
df -h
docker system df

# Clean up unused images
docker system prune -a
```

---

## Security Checklist

- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Enable HTTPS (Cloudflare or Let's Encrypt)
- [ ] Enable firewall (`ufw`)
- [ ] Keep Docker images updated (`docker-compose pull && docker-compose up -d`)
- [ ] Regular database backups
- [ ] Use non-root user in containers (already configured)
- [ ] Set up monitoring/alerts
- [ ] Limit failed login attempts (future feature)
- [ ] Enable rate limiting (future feature)

---

## Next Steps

After successful deployment:

1. **Test thoroughly**:
   - Register new user
   - Login/logout
   - Search Wikibase
   - Create collections
   - Add/remove items

2. **Monitor for 24 hours**:
   - Check logs for errors
   - Monitor resource usage
   - Test from different devices/networks

3. **Implement UI improvements** (see `docs/ui-improvements.md`)

4. **Add monitoring** (optional):
   - DigitalOcean Monitoring (built-in)
   - Uptime Robot (free)
   - Sentry for error tracking

5. **Deferred features**:
   - Password reset (Sprint 3)
   - Email notifications
   - Advanced search filters

---

## Support

- **Documentation**: See `/docs` directory
- **Issues**: https://github.com/YOUR_USERNAME/crudibase/issues
- **DigitalOcean Docs**: https://docs.digitalocean.com

---

**Last Updated**: 2025-01-10
