# Deployment Guide

This guide covers deploying the Sales Management System to production.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier available)
- Git repository (GitHub, GitLab, or Bitbucket)
- Vercel/Netlify account (optional, for hosting)

## Environment Setup

### 1. Supabase Project Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Note your project URL and anon key from Settings → API
3. Go to Database → Migrations (or use SQL Editor)
4. Run all migration files in order:
   - `20251126105230_fix_security_issues_indexes_and_rls.sql`
   - `20251126105553_enable_rls_for_company_branch_with_service_role.sql`

### 2. Environment Variables

Create `.env` file in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Never commit `.env` to version control!

## Local Development

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd project

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

Build output will be in `dist/` directory.

## Production Deployment

### Option 1: Vercel (Recommended)

**Why Vercel?**
- Zero-config deployment for Vite apps
- Automatic HTTPS
- Global CDN
- Free tier available
- Environment variable management

**Steps:**

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Set environment variables in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_ANON_KEY`

5. Redeploy with environment variables:
```bash
vercel --prod
```

**Vercel Configuration** (optional `vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Option 2: Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login:
```bash
netlify login
```

3. Initialize:
```bash
netlify init
```

4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

5. Set environment variables:
```bash
netlify env:set VITE_SUPABASE_URL "your-url"
netlify env:set VITE_SUPABASE_ANON_KEY "your-key"
```

6. Deploy:
```bash
netlify deploy --prod
```

**Netlify Configuration** (`netlify.toml`):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Option 3: Traditional Web Server (Apache/Nginx)

#### Build the application:
```bash
npm run build
```

#### Nginx Configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/sales-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Apache Configuration (`.htaccess`):
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

## Database Migrations

### Running Migrations on Production

**Method 1: Supabase Dashboard**
1. Go to Database → SQL Editor
2. Paste migration SQL
3. Run query

**Method 2: Supabase CLI**
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Migration Best Practices
- Always backup before running migrations
- Test migrations on staging first
- Migrations should be idempotent (use IF EXISTS)
- Never modify existing migrations
- Create new migrations for schema changes

## Post-Deployment Checklist

### Security
- [ ] Environment variables are set correctly
- [ ] `.env` is not committed to repository
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Database RLS is enabled

### Performance
- [ ] Production build is optimized
- [ ] Static assets are cached
- [ ] Gzip compression is enabled
- [ ] CDN is configured (if using)
- [ ] Database indexes are in place

### Functionality
- [ ] Login works correctly
- [ ] All master data screens load
- [ ] Orders can be created
- [ ] Collections can be recorded
- [ ] Reports generate correctly
- [ ] CSV exports work
- [ ] Image uploads work (if implemented)

### Monitoring
- [ ] Error tracking is set up
- [ ] Performance monitoring is enabled
- [ ] Database backups are scheduled
- [ ] Uptime monitoring is configured

## Initial Data Setup

After deployment, seed initial data:

1. **Create Admin User**
```sql
INSERT INTO user_master_tbl (
  user_name, email, password, role, is_active
) VALUES (
  'System Admin', 'admin@company.com', 'admin123', 'admin', true
);
```

2. **Create Company**
```sql
INSERT INTO company_master_tbl (
  company_code, company_name, is_active
) VALUES (
  'COMP001', 'Your Company Name', true
);
```

3. **Create Default Branch**
```sql
INSERT INTO branch_master_tbl (
  branch_code, branch_name, company_id, is_active
) VALUES (
  'BR001', 'Head Office', (SELECT id FROM company_master_tbl WHERE company_code = 'COMP001'), true
);
```

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check application performance
- Review database query performance

**Weekly:**
- Review user feedback
- Check disk usage
- Optimize slow queries

**Monthly:**
- Update dependencies
- Review and optimize indexes
- Database maintenance (VACUUM, ANALYZE)

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Build new version
npm run build

# Deploy to production
vercel --prod  # or your deployment method
```

### Database Backups

**Automatic:**
- Supabase provides daily automatic backups (7 days retention on free tier)

**Manual:**
```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or using pg_dump directly
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql
```

### Rollback Procedure

**Application Rollback:**
1. Revert Git commit: `git revert HEAD`
2. Rebuild: `npm run build`
3. Redeploy

**Database Rollback:**
1. Restore from backup in Supabase Dashboard
2. Or restore from manual backup:
```bash
psql -h db.your-project.supabase.co -U postgres -d postgres < backup.sql
```

## Monitoring & Alerts

### Recommended Tools

**Application Monitoring:**
- Vercel Analytics (built-in)
- Google Analytics
- Sentry for error tracking

**Database Monitoring:**
- Supabase Dashboard (built-in)
- pg_stat_statements for query analysis

**Uptime Monitoring:**
- UptimeRobot (free)
- Pingdom
- StatusCake

### Setting Up Alerts

1. **Supabase Alerts:**
   - Database CPU > 80%
   - Storage > 80%
   - API errors > threshold

2. **Application Alerts:**
   - Error rate spikes
   - Response time degradation
   - Failed deployments

## Scaling Considerations

### When to Scale

**Indicators:**
- Response time > 2 seconds
- Database connections maxed out
- CPU consistently > 70%
- Frequent timeout errors

### Scaling Options

1. **Vertical Scaling:**
   - Upgrade Supabase plan
   - Increase database resources

2. **Horizontal Scaling:**
   - Add database read replicas
   - Use connection pooler
   - Implement caching (Redis)

3. **Code Optimization:**
   - Lazy load components
   - Implement pagination
   - Optimize queries
   - Add database indexes

## Troubleshooting

### Common Issues

**Build Fails:**
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Environment Variables Not Working:**
- Ensure they start with `VITE_`
- Restart dev server after changes
- Check they're set in deployment platform

**Database Connection Issues:**
- Verify Supabase URL and key
- Check if project is paused (free tier)
- Review connection limits

**CORS Errors:**
- Add domain to Supabase allowed origins
- Check API endpoint configuration

## Support & Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev
- **React Docs:** https://react.dev

## License & Credits

Proprietary software. All rights reserved.
