# Nkabom Daycare API - Setup Guide

## Quick Start (5 minutes)

### 1. Prerequisites
```bash
# Check Node.js version (18+)
node --version

# Check npm version
npm --version

# PostgreSQL should be running
psql --version
```

### 2. Clone & Install
```bash
cd nkabom-daycare-api
npm install
```

### 3. Configure Environment
```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your settings
nano .env
```

### 4. Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE nkabom_daycare;

# Quit
\q
```

### 5. Run Server
```bash
# Development mode (auto-reload)
npm run dev

# Server runs on http://localhost:3000
```

### 6. Test API
```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"2024-01-01T12:00:00.000Z"}
```

## Complete Setup Guide

### Step 1: System Requirements

**Operating System:**
- Linux (Ubuntu 20.04 LTS or later)
- macOS 10.15 or later
- Windows 10/11 with WSL2

**Software:**
```
Node.js 18.16.0 or higher
npm 8.0.0 or higher
PostgreSQL 12 or higher
Git
```

### Step 2: Install Dependencies

**macOS (Homebrew)**
```bash
brew install node@18
brew install postgresql
```

**Ubuntu/Debian**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo apt-get install -y postgresql postgresql-contrib
```

**Windows**
- Download Node.js from nodejs.org
- Download PostgreSQL from postgresql.org
- Install both with default settings

### Step 3: Database Setup

**Start PostgreSQL:**
```bash
# macOS
brew services start postgresql

# Ubuntu
sudo systemctl start postgresql

# Windows (should auto-start)
```

**Create Database User:**
```bash
psql -U postgres
```

```sql
CREATE USER nkabom_user WITH PASSWORD 'secure_password_here';

CREATE DATABASE nkabom_daycare OWNER nkabom_user;

GRANT ALL PRIVILEGES ON DATABASE nkabom_daycare TO nkabom_user;

\q
```

### Step 4: Application Setup

**Clone Repository:**
```bash
git clone https://github.com/nkabom/daycare-api.git
cd daycare-api
```

**Install Dependencies:**
```bash
npm install
```

**Configure Environment:**
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=nkabom_user
DB_PASSWORD=secure_password_here
DB_NAME=nkabom_daycare
DB_SYNC=true

JWT_SECRET=your-super-secret-key-min-32-characters
JWT_EXPIRY=24h

TENANT_HEADER=x-tenant-id
```

**Build TypeScript:**
```bash
npm run build
```

**Start Server:**
```bash
npm run dev
```

Output should show:
```
✓ Database connected
✓ Plugins registered
✓ Routes registered
✓ Server running on http://0.0.0.0:3000
```

### Step 5: Test the API

**Health Check:**
```bash
curl -X GET http://localhost:3000/health
```

**API Info:**
```bash
curl -X GET http://localhost:3000/api/version
```

**Register User:**
```bash
# Get a tenant ID first (in production, these are created via admin panel)
# For testing, use: 550e8400-e29b-41d4-a716-446655440000

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+233123456789",
    "password": "SecurePass123!",
    "role": "parent"
  }'
```

## Docker Setup

### Build Docker Image

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error()})"

# Start server
CMD ["node", "dist/index.js"]
```

**Build:**
```bash
docker build -t nkabom-api:latest .
```

**Run with Docker Compose:**

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: nkabom_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: nkabom_daycare
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: nkabom_user
      DB_PASSWORD: secure_password
      DB_NAME: nkabom_daycare
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres

volumes:
  postgres_data:
```

**Run:**
```bash
docker-compose up
```

## Production Deployment

### AWS EC2 Deployment

**1. Launch EC2 Instance:**
- AMI: Ubuntu 22.04 LTS
- Type: t3.medium (2GB RAM minimum)
- Security Group: Open ports 22, 80, 443

**2. Install & Configure:**
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone application
git clone https://github.com/nkabom/daycare-api.git
cd daycare-api

# Install dependencies
npm install --production

# Build
npm run build
```

**3. Configure PM2 (Process Manager):**
```bash
sudo npm install -g pm2

pm2 start "npm start" --name "nkabom-api"
pm2 startup
pm2 save
```

**4. Configure Nginx Reverse Proxy:**
```bash
sudo nano /etc/nginx/sites-available/nkabom-api
```

```nginx
upstream nkabom_api {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.nkabom.app;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.nkabom.app;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.nkabom.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nkabom.app/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://nkabom_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**5. Enable SSL (Let's Encrypt):**
```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot certonly --nginx -d api.nkabom.app
```

**6. Restart Services:**
```bash
sudo systemctl restart nginx
pm2 restart nkabom-api
```

### Database Backups

**Automated Daily Backup:**
```bash
# Create backup script
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="nkabom_daycare"
DB_USER="nkabom_user"

mkdir -p $BACKUP_DIR

pg_dump -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup.sh
```

## Environment Variables

### Development
```env
PORT=3000
NODE_ENV=development
DB_SYNC=true
JWT_SECRET=dev-secret-key
```

### Staging
```env
PORT=3000
NODE_ENV=staging
DB_SYNC=false
JWT_SECRET=staging-secret-key
# Add AWS S3 keys
# Add payment gateway keys
```

### Production
```env
PORT=3000
NODE_ENV=production
DB_SYNC=false
JWT_SECRET=<very-secure-random-string>
# All external service keys configured
```

## Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check credentials
psql -U nkabom_user -d nkabom_daycare

# Check connection string in .env
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Lock
```bash
# Connect to PostgreSQL
psql -U nkabom_user -d nkabom_daycare

# View active connections
SELECT * FROM pg_stat_activity;

# Terminate if needed
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE usename = 'nkabom_user' AND state = 'active';
```

## Monitoring & Maintenance

### Health Checks
```bash
# API health
curl http://localhost:3000/health

# Database connection
curl http://localhost:3000/api/version
```

### View Logs
```bash
# PM2 logs
pm2 logs nkabom-api

# System logs
tail -f /var/log/syslog
```

### Performance Monitoring
```bash
# CPU & Memory usage
pm2 monit

# Database query performance
# Enable slow query log in PostgreSQL
```

## Next Steps

1. Set up Git deployment hooks
2. Configure CI/CD pipeline
3. Set up error tracking (Sentry)
4. Configure performance monitoring
5. Set up database replication
6. Configure Redis caching
7. Set up automated testing

For more details, see [README.md](./README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)
