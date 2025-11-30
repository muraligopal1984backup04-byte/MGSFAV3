# Sales Management System

A comprehensive sales and distribution management system built with React, TypeScript, Vite, and Supabase.

## Features

### Core Modules

#### Master Data Management
- **Company Master** - Multi-company support with hierarchical structure
- **Branch Master** - Branch-wise operations and reporting
- **Customer Master** - Complete customer database with KYC
- **Lead Management** - Lead tracking and conversion pipeline
- **Product Master** - Product catalog with pricing
- **Brand Master** - Brand-wise sales tracking
- **Route Master** - Route planning and optimization
- **User Management** - Role-based access control

#### Sales Operations
- **Sales Orders** - Order entry with multiple line items
- **Invoice Generation** - Automated invoicing with tax calculation
- **Bulk Invoice Upload** - CSV-based bulk invoice processing
- **Order Tracking** - Real-time order status monitoring

#### Collections & Payments
- **Collection Entry** - Payment collection against orders
- **Multi-line Collections** - Split payments across invoices
- **Payment Reconciliation** - Automated matching with orders

#### Field Force Management
- **Route Planning** - Route-customer mapping
- **User Route Assignment** - Field staff to route mapping
- **Beat Planning** - Day-wise route scheduling
- **Location Tracking** - GPS-based field staff tracking

#### Reporting & Analytics
- **Route-wise Sales Report** - Sales analysis by route
- **Field Staff Sales Report** - Performance tracking by staff
- **Brand-wise Sales Report** - Brand performance analysis
- **Customer-wise Reports** - Customer purchase patterns
- **Date Range Filtering** - Flexible reporting periods

### Technical Features
- **Responsive Design** - Mobile-first responsive UI
- **Real-time Updates** - Live data synchronization
- **Secure Authentication** - Custom role-based auth system
- **Data Validation** - Client and server-side validation
- **Audit Trail** - Complete user action tracking
- **Export Capabilities** - CSV exports for all reports

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API
- **Routing**: React Router v6

## Project Structure

```
project/
├── src/
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   ├── customers/      # Customer management
│   │   ├── leads/          # Lead management
│   │   ├── orders/         # Sales order components
│   │   ├── collections/    # Payment collection
│   │   ├── invoices/       # Invoice management
│   │   ├── routes/         # Route management
│   │   ├── reports/        # Reporting components
│   │   └── masters/        # Master data components
│   ├── contexts/           # React Context providers
│   ├── lib/               # Utilities and helpers
│   └── App.tsx            # Main application component
├── supabase/
│   └── migrations/        # Database migrations
├── .env                   # Environment variables
└── package.json          # Dependencies

```

## Database Schema

### Master Tables
- `company_master_tbl` - Company information
- `branch_master_tbl` - Branch details
- `customer_master_tbl` - Customer database
- `lead_master_tbl` - Lead information
- `product_master_tbl` - Product catalog
- `brand_master_tbl` - Brand data
- `route_master_tbl` - Route definitions
- `user_master_tbl` - User accounts

### Transaction Tables
- `sale_order_header_tbl` - Order headers
- `sale_order_detail_tbl` - Order line items
- `sales_inv_hdr_tbl` - Invoice headers
- `sales_inv_dtl_tbl` - Invoice line items
- `collection_detail_tbl` - Payment collections
- `collection_detail_line_tbl` - Collection line items

### Mapping Tables
- `route_customer_mapping_tbl` - Route-customer assignments
- `user_route_mapping_tbl` - User-route assignments
- `customer_user_assignments_tbl` - Customer-user assignments

### Supporting Tables
- `customer_address_tbl` - Customer addresses
- `customer_media_tbl` - Customer documents/photos
- `lead_address_tbl` - Lead addresses
- `product_price_tbl` - Product pricing
- `user_location_tbl` - GPS tracking data

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd project
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
Create a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run database migrations
All migrations are in `supabase/migrations/` and are automatically applied to your Supabase project.

5. Start development server
```bash
npm run dev
```

6. Build for production
```bash
npm run build
```

## Key Features Explained

### Auto-fetch Route and Field Staff
When selecting a customer in orders or collections:
1. System queries `route_customer_mapping_tbl` to find the customer's route
2. System queries `user_route_mapping_tbl` to find assigned field staff
3. Route and Field Staff dropdowns are auto-populated
4. Users can override if needed

### Bulk Invoice Upload
1. Prepare CSV with columns: invoice_no, invoice_date, order_no, customer_code, product_code, quantity, unit_price, discount_percentage, tax_percentage
2. Upload via Invoice Management screen
3. System validates all data and creates invoices with line items
4. Auto-fetches route and field staff from customer mappings

### Row Level Security
- All tables have RLS enabled
- Custom authentication system (not Supabase Auth)
- Application-level access control via role checks
- Permissive policies for compatibility

### Reporting System
- Date range selection for all reports
- Export to CSV functionality
- Filters by route, staff, branch, brand
- Real-time data updates

## Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Role-Based Access**: Admin, Manager, User roles
- **Audit Trails**: All create/update operations tracked
- **Foreign Key Indexes**: All FK columns indexed for performance
- **Secure Functions**: Search path protection on triggers

## Performance Optimizations

- **Comprehensive Indexing**: All foreign keys and frequently queried columns indexed
- **Optimized Queries**: Using `maybeSingle()` for zero-or-one results
- **Efficient Joins**: Proper index coverage on all join columns
- **Minimal Re-renders**: React Context optimization

## Database Migrations

Migrations follow a strict format:
- Detailed markdown summary at top
- IF EXISTS/IF NOT EXISTS for idempotency
- RLS enabled on all new tables
- Restrictive RLS policies by default
- Comprehensive indexes

Key migrations:
- `20251125020348` - Customer user assignments
- `20251125032158` - Beat plan infrastructure
- `20251126105230` - Security fixes and indexes
- `20251126105553` - RLS for company/branch tables

## Access Control

### Admin Role
- Full system access
- Company and branch management
- User management
- All master data operations

### Manager Role
- Branch-level operations
- Customer and lead management
- Sales order processing
- Collection entry
- Reporting access

### User Role
- Limited data entry
- View own records
- Basic reporting

## Contributing

1. Create feature branch
2. Make changes with proper testing
3. Ensure migrations are idempotent
4. Update documentation
5. Submit pull request

## Support

For issues or questions, please create an issue in the repository.

## License

Proprietary - All rights reserved
