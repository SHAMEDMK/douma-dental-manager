# Production Deployment Guide - Douma Dental

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database (for production)
- Domain name configured (optional, for HTTPS)

## Environment Setup

### 1. Copy Environment Files

```bash
# For production
cp .env.production.example .env.production

# Edit .env.production with your actual values
nano .env.production
```

### 2. Required Environment Variables

**Database (PostgreSQL):**
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/douma_dental?schema=public"
```

**Authentication (REQUIRED):**
```bash
# Generate a strong secret:
openssl rand -base64 32
# Or: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

JWT_SECRET="your-generated-secret-here-minimum-32-bytes"
```

**Application:**
```bash
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

**Admin User (for seed):**
```bash
ADMIN_PASSWORD="your-strong-admin-password-minimum-8-chars"
```

## Database Setup

### 1. Update Prisma Schema for PostgreSQL

The schema currently uses SQLite. For production, update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 2. Run Migrations

```bash
# Generate Prisma Client
npm run postinstall

# Run migrations (creates tables)
npm run db:migrate:deploy
```

### 3. Seed Initial Data

```bash
# Creates admin@douma.com user (only if doesn't exist)
npm run db:seed
```

**Important:** The seed script will:
- Only create admin user if it doesn't exist
- Use `ADMIN_PASSWORD` from environment
- Skip if admin already exists (safe to run multiple times)

## Build and Start

### Production Build

```bash
# Install dependencies
npm ci

# Build application (includes Prisma generate)
npm run build
```

### Production Start

```bash
# Start production server
npm start
```

The application will be available at the port specified by `PORT` environment variable (default: 3000).

## Commands Summary

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run database migrations (dev)
npm run db:migrate

# Push schema changes (dev only, not for production)
npm run db:push

# Seed database (dev)
npm run db:seed
```

### Production

```bash
# Install dependencies (production)
npm ci

# Generate Prisma Client
npm run postinstall

# Run database migrations (production)
npm run db:migrate:deploy

# Seed initial admin user (production)
npm run db:seed

# Build application
npm run build

# Start production server
npm start
```

## Security Checklist

- [ ] `JWT_SECRET` is set to a strong random value (32+ bytes)
- [ ] `ADMIN_PASSWORD` is set to a strong password (8+ characters)
- [ ] `DATABASE_URL` uses secure credentials
- [ ] `NODE_ENV` is set to `production`
- [ ] HTTPS is enabled (via reverse proxy or Next.js)
- [ ] Database is not publicly accessible
- [ ] `.env.production` is not committed to git

## Database Provider Support

### Current: SQLite (Development)
- Provider: `sqlite`
- File-based, no server required
- Good for local development

### Production: PostgreSQL
- Provider: `postgresql`
- Requires PostgreSQL server
- Update `prisma/schema.prisma` datasource provider
- Connection string format: `postgresql://user:password@host:port/database?schema=public`

## Troubleshooting

### Prisma Client Not Generated
```bash
npm run postinstall
# or
npx prisma generate
```

### Migration Errors
```bash
# Check migration status
npx prisma migrate status

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### Admin User Already Exists
The seed script is safe - it checks if admin exists before creating. If you need to reset:
1. Delete the user from database
2. Run `npm run db:seed` again

### JWT Secret Issues
Ensure `JWT_SECRET` is:
- At least 32 bytes long
- Random and unique
- Never committed to git
- Different for each environment

## Reverse Proxy (Nginx Example)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Health Check

The application includes a health check endpoint:
```
GET /api/health
```

Use this for monitoring and load balancer health checks.
