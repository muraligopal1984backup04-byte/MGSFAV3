# Quick Start Guide

Get the Sales Management System up and running in 10 minutes.

## Prerequisites

Make sure you have:
- [Node.js 18+](https://nodejs.org/) installed
- [Git](https://git-scm.com/) installed
- A [Supabase](https://supabase.com) account (free tier is fine)
- A code editor (VS Code recommended)

## Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd sales-management-system
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages (~2-3 minutes).

## Step 3: Set Up Supabase

### 3.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: Sales Management System
   - Database Password: (choose a strong password)
   - Region: (choose closest to you)
4. Click "Create new project" and wait for setup (~2 minutes)

### 3.2 Get Your API Keys

1. In your Supabase project, go to Settings → API
2. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (a long string starting with `eyJ...`)

### 3.3 Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Open `supabase/migrations/20251126105230_fix_security_issues_indexes_and_rls.sql`
3. Copy the entire contents
4. Paste into SQL Editor and click "Run"
5. Repeat for `20251126105553_enable_rls_for_company_branch_with_service_role.sql`

## Step 4: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 5: Start Development Server

```bash
npm run dev
```

The application will open at `http://localhost:5173`

## Step 6: Create Initial Data

### 6.1 Create Admin User

In Supabase SQL Editor, run:

```sql
INSERT INTO user_master_tbl (
  user_name,
  email,
  password,
  role,
  is_active
) VALUES (
  'System Admin',
  'admin@yourcompany.com',
  'admin123',
  'admin',
  true
);
```

### 6.2 Create Company

```sql
INSERT INTO company_master_tbl (
  company_code,
  company_name,
  is_active
) VALUES (
  'COMP001',
  'Your Company Name',
  true
);
```

### 6.3 Create Branch

```sql
INSERT INTO branch_master_tbl (
  branch_code,
  branch_name,
  company_id,
  is_active
) VALUES (
  'BR001',
  'Head Office',
  (SELECT id FROM company_master_tbl WHERE company_code = 'COMP001'),
  true
);
```

## Step 7: Login to the Application

1. Go to `http://localhost:5173`
2. Login with:
   - Email: `admin@yourcompany.com`
   - Password: `admin123`

**Important:** Change this password after first login!

## You're Done! 🎉

You now have a fully functional Sales Management System.

## Next Steps

### Add More Users
1. Go to Masters → User Management
2. Click "Add User"
3. Fill in user details
4. Assign appropriate role (Admin/Manager/User)

### Add Customers
1. Go to Masters → Customer Management
2. Click "Add Customer"
3. Fill in customer information

### Add Products
1. Go to Masters → Product Management
2. Click "Add Product"
3. Add product details

### Create Your First Order
1. Go to Transactions → Sales Orders
2. Click "New Order"
3. Select customer
4. Add products
5. Submit order

## Common Issues

### Issue: "Cannot connect to database"
**Solution:** Check your `.env` file has correct Supabase credentials

### Issue: "No users found" after login attempt
**Solution:** Make sure you ran the SQL to create admin user in Step 6.1

### Issue: Build fails
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: Port 5173 already in use
**Solution:** Kill the process or change port in `vite.config.ts`:
```typescript
server: {
  port: 5174,  // Use different port
}
```

## Useful Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Type check
npm run type-check
```

## Project Structure Overview

```
project/
├── src/               # Source code (when added)
├── supabase/         # Database migrations
├── .env              # Your environment variables (not in git)
├── package.json      # Dependencies
└── docs/             # Documentation
```

## Learning Resources

- **Full Documentation:** See `README.md`
- **Architecture:** See `ARCHITECTURE.md`
- **Database Schema:** See `DATABASE_SCHEMA.md`
- **Deployment:** See `DEPLOYMENT.md`
- **Contributing:** See `CONTRIBUTING.md`

## Getting Help

1. Check the documentation files
2. Review error messages in browser console (F12)
3. Check Supabase logs in Dashboard
4. Search existing issues
5. Create a new issue with details

## Security Note

⚠️ **Important Security Practices:**

1. Never commit `.env` file
2. Change default admin password
3. Use strong passwords for all users
4. Keep dependencies updated
5. Review and test before deploying to production

## What's Next?

Now that your system is running:

1. **Customize** - Update company information
2. **Add Data** - Create users, customers, products
3. **Configure Routes** - Set up sales routes
4. **Assign Users** - Map users to routes
5. **Start Using** - Create orders and track sales

Enjoy using the Sales Management System! 🚀
