# Sales Management System

A comprehensive enterprise-grade sales and distribution management system with Business Intelligence reporting, built with React, TypeScript, Vite, and Supabase.

[![Built with React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Setup Guide](#setup-guide)
- [Deployment](#deployment)
- [Documentation](#documentation)

## ✨ Features

### 🎯 Core Modules

#### Master Data Management
- **Company Master** - Multi-company hierarchical structure
- **Branch Master** - Branch-wise operations and reporting
- **Brand Master** - Brand management and tracking
- **Customer Master** - Complete customer database with KYC
- **Product Master** - Product catalog with pricing tiers
- **Route Master** - Route planning and optimization
- **User Management** - Role-based access control (Admin, Manager, User, Customer)

#### Sales Operations
- **Sales Orders** - Multi-line order entry with auto-calculations
- **Invoice Management** - Automated invoicing with tax calculation
- **Bulk Invoice Upload** - CSV-based bulk invoice processing with validation
- **Order Tracking** - Real-time order status monitoring

#### Collections & Payments
- **Collection Entry** - Payment collection against invoices
- **Multi-line Collections** - Split payments across multiple invoices
- **Payment Reconciliation** - Automated invoice matching

#### Field Force Management
- **Route Planning** - Route-customer mapping
- **User Route Assignment** - Field staff to route mapping
- **Beat Planning** - Day-wise route scheduling
- **Auto-fetch Logic** - Automatic route and staff assignment based on customer

#### Inventory Management
- **Daily Stock Upload** - CSV bulk upload for stock quantities
- **Daily Stock Report** - Comprehensive stock view with filters
- **Price Management** - Product pricing with fetch-on-demand
- **Stock Analytics** - Last upload tracking and reporting

#### 📊 Business Intelligence Reports

##### Sales Invoice Report
- Complete invoice analytics with drill-down to line items
- Filters: Branch, Customer, Date Range, Payment Status
- Summary cards: Total Sales, Net Amount, Discounts, Tax
- CSV Export capability

##### Route-Wise Sales Report
- Sales performance by delivery routes
- Customer breakdown within each route
- Metrics: Invoices, Customers, Gross/Net Sales
- CSV Export

##### Field Staff Sales Report
- Performance tracking by field staff
- Recent order history drill-down
- Metrics: Orders, Invoices, Customers, Sales
- CSV Export

##### Brand-Wise Insights
- Performance analytics by brand
- Market share visualization with progress bars
- Ranking system and product count
- CSV Export

##### Customer Purchase Pattern & Trends
- Behavioral insights and purchasing trends
- First/last purchase tracking
- Purchase frequency analysis (orders per month)
- Color-coded frequency indicators
- Sort by: Total Spent, Frequency, Recent activity
- CSV Export

##### Age-Wise Outstanding Report
- Receivables aging analysis
- Buckets: <45, 45-60, 60-90, 90-120, >120 days
- Branch and customer filters
- Non-zero bucket filtering
- CSV bulk upload and export

### 🔧 Technical Features

- **Responsive Design** - Mobile-first, works on all devices
- **Real-time Updates** - Live data synchronization
- **Custom Authentication** - Role-based access control
- **Row Level Security** - Database-level security policies
- **Data Validation** - Client and server-side validation
- **Audit Trail** - Complete user action tracking
- **Export Capabilities** - CSV exports for all reports
- **Drill-Down Reports** - Interactive expandable data views
- **Auto-calculations** - Automatic tax, discount, and total calculations
- **Bulk Operations** - CSV upload for invoices, stock, and outstanding

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript 5.3** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icon system
- **React Router v6** - Client-side routing
- **Context API** - State management

### Backend
- **Supabase** - PostgreSQL database with real-time features
- **Row Level Security** - Database-level access control
- **PostgreSQL** - Powerful relational database
- **Triggers & Functions** - Automated database operations

### Development Tools
- **ESLint** - Code linting
- **TypeScript Compiler** - Type checking
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Supabase account
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sales-management-system

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
sales-management-system/
├── src/
│   ├── components/
│   │   ├── admin/              # Admin panel components
│   │   ├── auth/               # Authentication
│   │   ├── collections/        # Payment collections
│   │   ├── crm/               # Customer management
│   │   ├── inventory/         # Stock management
│   │   │   ├── DailyStockUpload.tsx
│   │   │   └── DailyStockReport.tsx
│   │   ├── invoices/          # Invoice management
│   │   ├── orders/            # Sales orders
│   │   ├── products/          # Product catalog
│   │   ├── reports/           # BI Reports
│   │   │   ├── SalesInvoiceReport.tsx
│   │   │   ├── RouteWiseSales.tsx
│   │   │   ├── FieldStaffSales.tsx
│   │   │   ├── BrandWiseInsights.tsx
│   │   │   ├── CustomerPurchasePattern.tsx
│   │   │   └── AgeWiseOutstanding.tsx
│   │   ├── routes/            # Route management
│   │   └── shared/            # Shared components
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication context
│   ├── lib/
│   │   └── supabase.ts        # Supabase client
│   ├── App.tsx                # Main app component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles
├── supabase/
│   └── migrations/           # Database migrations
│       ├── 20251126105230_fix_security_issues_indexes_and_rls.sql
│       ├── 20251126105553_enable_rls_for_company_branch_with_service_role.sql
│       └── 20251129142348_add_bulk_upload_tracking_and_product_fields.sql
├── public/                   # Static assets
├── .env                     # Environment variables (git-ignored)
├── .env.example            # Environment template
├── package.json            # Dependencies
├── tsconfig.json          # TypeScript config
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS config
├── SETUP_GUIDE.md       # Detailed setup instructions
├── DEPLOYMENT.md        # Deployment guide
└── DATABASE_SCHEMA.md   # Complete schema documentation
```

## 🗄️ Database Schema

### Master Tables (12)
- `company_master_tbl` - Company information
- `branch_master_tbl` - Branch details
- `brand_master_tbl` - Brand data
- `customer_master_tbl` - Customer database
- `product_master_tbl` - Product catalog
- `route_master_tbl` - Route definitions
- `user_master_tbl` - User accounts
- `customer_address_tbl` - Customer addresses
- `product_price_tbl` - Product pricing
- `customer_media_tbl` - Customer documents
- `lead_master_tbl` - Lead information
- `lead_address_tbl` - Lead addresses

### Transaction Tables (8)
- `sale_order_header_tbl` - Order headers
- `sale_order_detail_tbl` - Order line items
- `invoice_header_tbl` - Invoice headers
- `invoice_detail_tbl` - Invoice line items
- `collection_detail_tbl` - Payment collections
- `collection_detail_line_tbl` - Collection line items
- `daily_stock_tbl` - Daily stock records
- `age_wise_outstanding_tbl` - Outstanding receivables

### Mapping Tables (3)
- `route_customer_mapping_tbl` - Route-customer assignments
- `user_route_mapping_tbl` - User-route assignments
- `customer_user_assignments_tbl` - Customer-user assignments

### Tracking Tables (2)
- `user_location_tbl` - GPS tracking data
- `bulk_upload_tracking_tbl` - Bulk upload history

**Total Tables: 25**

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for complete schema documentation.

## 📖 Setup Guide

For detailed setup instructions including database setup, migration execution, and troubleshooting, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

### Quick Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project dashboard at: Settings > API

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions including:
- Vercel deployment
- Netlify deployment
- Production build optimization
- Environment variable configuration
- Database migration in production

## 📚 Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Complete setup instructions
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Database documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

## 🔑 Key Features Explained

### Auto-fetch Route and Field Staff
When selecting a customer in orders or collections:
1. System queries `route_customer_mapping_tbl` to find the customer's route
2. System queries `user_route_mapping_tbl` to find assigned field staff
3. Route and Field Staff dropdowns are auto-populated
4. Users can override if needed

### Bulk Upload Operations
- **Invoices**: Upload multiple invoices with line items via CSV
- **Daily Stock**: Bulk upload stock quantities by branch/product
- **Age-Wise Outstanding**: Import receivables aging data
- All uploads include validation and error reporting

### Security Architecture
- **Custom Authentication**: Email/password with Supabase backend
- **Row Level Security**: Enabled on all tables
- **Role-Based Access**: Admin, Manager, User, Customer roles
- **Audit Trails**: Created/updated by tracking on all records
- **Secure Functions**: Search path protection on all triggers

### Performance Optimizations
- **Comprehensive Indexing**: All FKs and frequently queried columns
- **Efficient Queries**: Using `maybeSingle()` for zero-or-one results
- **Optimized Joins**: Proper index coverage on all join columns
- **React Optimization**: Context memoization and minimal re-renders

## 🔐 Access Control

### Admin Role
- Full system access
- Company and branch management
- User management
- All master data operations

### Manager Role
- Branch-level operations
- Customer and product management
- Sales order and invoice processing
- Collection entry and reporting

### User Role (Field Staff)
- Limited data entry
- View assigned customers
- Basic reporting access

### Customer Role
- View own orders and invoices
- View assigned routes
- Limited reporting access

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make changes with proper testing
3. Ensure migrations are idempotent
4. Update documentation
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For issues or questions:
- Create an issue in the repository
- Check existing documentation
- Review migration files for schema questions

## 🎯 Roadmap

- [ ] Mobile app for field staff
- [ ] Real-time notifications
- [ ] Advanced analytics dashboards
- [ ] WhatsApp integration
- [ ] Email automation
- [ ] Advanced inventory forecasting

---

**Built with ❤️ using React, TypeScript, and Supabase**
