# Sales Management System - Complete Setup Guide

This guide will walk you through setting up the Sales Management System from scratch, including database setup, application configuration, and initial data seeding.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Database Schema Setup](#database-schema-setup)
4. [Application Setup](#application-setup)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Initial Data Setup](#initial-data-setup)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **npm** 9 or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Modern web browser** (Chrome, Firefox, Safari, or Edge)

### Required Accounts
- **Supabase Account** (free tier available at [supabase.com](https://supabase.com))

### Verify Installation

```bash
# Check Node.js version
node --version  # Should show v18.x.x or higher

# Check npm version
npm --version   # Should show 9.x.x or higher

# Check Git version
git --version
```

## Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in the project details:
   - **Name**: Sales Management System
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select closest to your users
   - **Pricing Plan**: Free tier works fine for development
4. Click "Create new project"
5. Wait 2-3 minutes for project initialization

### Step 2: Get API Credentials

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
3. Save these values - you'll need them soon

### Step 3: Access Database

1. Go to **Database** in the left sidebar
2. You'll see your PostgreSQL database is ready
3. Note: Keep the **Service Role** key private - never expose it in frontend code

## Database Schema Setup

### Option 1: Using Supabase Dashboard (Recommended for this setup)

Since you already have a Supabase database with tables, you'll connect to the SAME database:

1. **DO NOT** run migrations that create tables - they already exist
2. Simply connect your new application to the existing database using the SAME credentials
3. All tables, data, and relationships will be automatically available

### Option 2: Fresh Setup (If starting from scratch)

If you need to set up the database from scratch:

1. Go to **SQL Editor** in Supabase dashboard
2. Click "New Query"
3. Copy and paste each migration file from `supabase/migrations/` in order:

#### Migration Files (in order):

```sql
-- 1. First migration: Security fixes and indexes
-- File: 20251126105230_fix_security_issues_indexes_and_rls.sql
-- (Copy entire file content and run)

-- 2. Second migration: RLS for company/branch
-- File: 20251126105553_enable_rls_for_company_branch_with_service_role.sql
-- (Copy entire file content and run)

-- 3. Third migration: Bulk upload tracking
-- File: 20251129142348_add_bulk_upload_tracking_and_product_fields.sql
-- (Copy entire file content and run)
```

4. After each migration:
   - Click "Run" button
   - Check for any errors in the output
   - Verify tables are created in the Database > Tables view

## Application Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <your-repository-url>
cd sales-management-system

# Or if you're copying files manually:
# Create project directory and copy all files
```

### Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# This will install:
# - React, React Router, TypeScript
# - Supabase client library
# - Tailwind CSS
# - Lucide React icons
# - Development tools (Vite, ESLint, etc.)
```

### Step 3: Create Environment File

```bash
# Copy the example environment file
cp .env.example .env

# Or create .env manually with this content:
```

Edit `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important Notes:**
- Replace `your-project` with your actual Supabase project reference
- Replace `your-anon-key-here` with your anon public key from Supabase
- NEVER commit `.env` to Git (it's already in .gitignore)
- The `VITE_` prefix is required for Vite to expose these variables to the client

## Running the Application

### Development Mode

```bash
# Start the development server
npm run dev

# Output should show:
# VITE v5.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

Open your browser to `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Output will be in the dist/ folder
# Files are optimized and minified
```

### Preview Production Build

```bash
# Preview the production build locally
npm run preview

# Opens on http://localhost:4173
```

## Environment Configuration

### Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous key for client | `eyJhbGciOiJIUzI1NiIs...` |

### Multiple Environments

For different environments (dev, staging, prod):

```bash
# .env.development
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev-key-here

# .env.production
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-key-here
```

## Initial Data Setup

### Step 1: Create Admin User

Since you have an existing database, you should already have users. To log in:

1. Open the application
2. Use your existing credentials
3. If you need to create a new admin user, use Supabase SQL Editor:

```sql
-- Create admin user
INSERT INTO user_master_tbl (
  full_name,
  email,
  password_hash,
  role,
  is_active
) VALUES (
  'System Admin',
  'admin@yourdomain.com',
  'hashed_password_here',  -- Use proper password hashing!
  'admin',
  true
);
```

### Step 2: Verify Existing Data

Check that your existing data is accessible:

```sql
-- Check companies
SELECT * FROM company_master_tbl LIMIT 5;

-- Check branches
SELECT * FROM branch_master_tbl LIMIT 5;

-- Check customers
SELECT * FROM customer_master_tbl LIMIT 5;

-- Check products
SELECT * FROM product_master_tbl LIMIT 5;
```

### Step 3: Access the Application

1. Navigate to `http://localhost:5173`
2. Log in with your credentials
3. You should see the dashboard with your existing data

## Connecting to Existing Database

### Important: Using the SAME Database

To connect your new Bolt application to the existing database:

1. **DO NOT** create new tables
2. **USE** the same environment variables:
   ```env
   VITE_SUPABASE_URL=<your-existing-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-existing-anon-key>
   ```
3. **VERIFY** connection by checking if data loads
4. All existing data will be immediately available

### Verification Checklist

✅ Application starts without errors
✅ Login page appears
✅ Can log in with existing credentials
✅ Dashboard shows existing data
✅ Can navigate through all modules
✅ Reports display existing data

## Troubleshooting

### Issue: "Failed to fetch"

**Cause**: Supabase URL or API key is incorrect

**Solution**:
1. Double-check `.env` file
2. Verify credentials in Supabase dashboard
3. Ensure no extra spaces in `.env` values
4. Restart dev server after changing `.env`

### Issue: "Row Level Security" errors

**Cause**: RLS policies preventing data access

**Solution**:
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Verify policies exist
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Issue: Tables not found

**Cause**: Database migrations not run or wrong database

**Solution**:
1. Verify you're connected to correct database
2. Check table list in Supabase > Database > Tables
3. Run migrations if tables are missing
4. Confirm `.env` points to correct project

### Issue: Build fails

**Cause**: TypeScript errors or missing dependencies

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check

# Try building again
npm run build
```

### Issue: Slow query performance

**Cause**: Missing indexes or inefficient queries

**Solution**:
```sql
-- Add indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_table_fk_column
ON table_name(fk_column);

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM your_table WHERE ...;
```

### Issue: Authentication not working

**Cause**: User table structure mismatch

**Solution**:
1. Verify `user_master_tbl` structure matches AuthContext expectations
2. Check password hashing matches
3. Verify email format is correct
4. Check user is active (`is_active = true`)

## Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Type check
npm run type-check

# Clear cache and reinstall
rm -rf node_modules package-lock.json dist .vite
npm install
```

## Next Steps

After successful setup:

1. ✅ Verify all modules are working
2. ✅ Test user authentication
3. ✅ Check data loading in reports
4. ✅ Test CRUD operations
5. ✅ Review RLS policies
6. 📖 Read [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
7. 📖 Review [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for schema details

## Getting Help

If you encounter issues:

1. Check this troubleshooting section
2. Review [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
3. Check Supabase logs in dashboard
4. Review browser console for errors
5. Check network tab for failed requests

## Security Checklist

Before going to production:

- [ ] Environment variables not committed to Git
- [ ] `.env` file in `.gitignore`
- [ ] RLS enabled on all tables
- [ ] Admin passwords are strong
- [ ] Service role key kept private
- [ ] HTTPS enabled in production
- [ ] CORS configured correctly
- [ ] Database backups enabled
- [ ] Error logging configured

---

**Setup complete! 🎉**

Your Sales Management System should now be up and running.
