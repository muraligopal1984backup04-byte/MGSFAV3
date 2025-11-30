# Database Schema Documentation

Complete database schema for the Sales Management System.

## Overview

The database uses PostgreSQL 15+ with the following structure:
- **Master Tables**: Core business entities
- **Transaction Tables**: Business operations
- **Mapping Tables**: Many-to-many relationships
- **Supporting Tables**: Additional data storage

## Entity Relationship Diagram (Conceptual)

```
┌─────────────────┐
│  company_master │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│  branch_master  │
└─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│  user_master    │◄────►│  route_master   │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│customer_master  │◄────►│ route_customer  │
└────────┬────────┘      │    mapping      │
         │                └─────────────────┘
         │
         ▼
┌─────────────────┐
│ sale_order_hdr  │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│ sale_order_dtl  │
└─────────────────┘
```

## Master Tables

### company_master_tbl

Stores company/organization information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| company_code | text | UNIQUE, NOT NULL | Company code |
| company_name | text | NOT NULL | Company name |
| address | text | | Company address |
| city | text | | City |
| state | text | | State/Province |
| country | text | | Country |
| postal_code | text | | Postal/ZIP code |
| phone | text | | Phone number |
| email | text | | Email address |
| website | text | | Website URL |
| gstin | text | | GST/Tax number |
| pan | text | | PAN number |
| is_active | boolean | DEFAULT true | Active status |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Indexes:**
- `idx_company_master_code` on (company_code)
- `idx_company_master_active` on (is_active)

**RLS:** Enabled with permissive policies

---

### branch_master_tbl

Branch/location information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| company_id | uuid | FK → company_master_tbl(id) | Parent company |
| branch_code | text | UNIQUE, NOT NULL | Branch code |
| branch_name | text | NOT NULL | Branch name |
| address | text | | Branch address |
| city | text | | City |
| state | text | | State |
| phone | text | | Phone number |
| email | text | | Email address |
| is_active | boolean | DEFAULT true | Active status |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Indexes:**
- `idx_branch_master_code` on (branch_code)
- `idx_branch_master_active` on (is_active)

**RLS:** Enabled with permissive policies

---

### user_master_tbl

User accounts and authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_name | text | NOT NULL | Full name |
| email | text | UNIQUE, NOT NULL | Email (login) |
| password | text | NOT NULL | Password (plain text) |
| phone | text | | Phone number |
| role | text | NOT NULL | Role (admin/manager/user) |
| branch_id | uuid | FK → branch_master_tbl(id) | Assigned branch |
| is_active | boolean | DEFAULT true | Active status |
| created_by | uuid | FK → user_master_tbl(id) | Creator |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Indexes:**
- `idx_user_master_created_by` on (created_by)

**Security Note:** Uses custom authentication, not Supabase Auth

---

### customer_master_tbl

Customer database.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| customer_code | text | UNIQUE, NOT NULL | Customer code |
| customer_name | text | NOT NULL | Customer name |
| contact_person | text | | Contact person name |
| phone | text | | Phone number |
| email | text | | Email address |
| gstin | text | | GST number |
| pan | text | | PAN number |
| credit_limit | numeric | DEFAULT 0 | Credit limit |
| payment_terms | text | | Payment terms |
| customer_type | text | | Type (retail/wholesale) |
| is_active | boolean | DEFAULT true | Active status |
| created_by | uuid | FK → user_master_tbl(id) | Creator |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Indexes:**
- `idx_customer_master_created_by` on (created_by)

---

### product_master_tbl

Product catalog.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| product_code | text | UNIQUE, NOT NULL | Product code |
| product_name | text | NOT NULL | Product name |
| description | text | | Product description |
| brand_id | uuid | FK → brand_master_tbl(id) | Brand |
| category | text | | Product category |
| unit_of_measure | text | | UOM (pcs/kg/ltr) |
| hsn_code | text | | HSN/SAC code |
| tax_percentage | numeric | DEFAULT 0 | Tax rate |
| is_active | boolean | DEFAULT true | Active status |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Indexes:**
- `idx_product_brand_id` on (brand_id)

---

### brand_master_tbl

Brand information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| brand_code | text | UNIQUE, NOT NULL | Brand code |
| brand_name | text | NOT NULL | Brand name |
| description | text | | Description |
| is_active | boolean | DEFAULT true | Active status |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

---

### route_master_tbl

Sales route definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| route_code | text | UNIQUE, NOT NULL | Route code |
| route_name | text | NOT NULL | Route name |
| description | text | | Description |
| is_active | boolean | DEFAULT true | Active status |
| created_by | uuid | FK → user_master_tbl(id) | Creator |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Indexes:**
- `idx_route_master_route_code` on (route_code)
- `idx_route_master_is_active` on (is_active)
- `idx_route_master_created_by` on (created_by)

---

## Transaction Tables

### sale_order_header_tbl

Sales order headers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| order_no | text | UNIQUE, NOT NULL | Order number |
| order_date | date | NOT NULL | Order date |
| customer_id | uuid | FK → customer_master_tbl(id), NOT NULL | Customer |
| branch_id | uuid | FK → branch_master_tbl(id) | Branch |
| route_id | uuid | FK → route_master_tbl(id) | Route |
| field_staff_id | uuid | FK → user_master_tbl(id) | Field staff |
| billing_address_id | uuid | FK → customer_address_tbl(id) | Billing address |
| shipping_address_id | uuid | FK → customer_address_tbl(id) | Shipping address |
| order_status | text | DEFAULT 'pending' | Status |
| total_amount | numeric | DEFAULT 0 | Total amount |
| discount_amount | numeric | DEFAULT 0 | Discount |
| tax_amount | numeric | DEFAULT 0 | Tax amount |
| net_amount | numeric | DEFAULT 0 | Net amount |
| notes | text | | Notes |
| created_by | uuid | FK → user_master_tbl(id) | Creator |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Indexes:**
- `idx_order_created_by` on (created_by)
- `idx_sale_order_branch` on (branch_id)
- `idx_sale_order_header_route_id` on (route_id)
- `idx_sale_order_header_field_staff_id` on (field_staff_id)
- `idx_sale_order_header_billing_address_id` on (billing_address_id)
- `idx_sale_order_header_shipping_address_id` on (shipping_address_id)

---

### sale_order_detail_tbl

Sales order line items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| order_id | uuid | FK → sale_order_header_tbl(id), NOT NULL | Order header |
| line_no | integer | NOT NULL | Line number |
| product_id | uuid | FK → product_master_tbl(id), NOT NULL | Product |
| brand_id | uuid | FK → brand_master_tbl(id) | Brand |
| quantity | numeric | NOT NULL | Quantity |
| unit_price | numeric | NOT NULL | Unit price |
| discount_percentage | numeric | DEFAULT 0 | Discount % |
| discount_amount | numeric | DEFAULT 0 | Discount amount |
| tax_percentage | numeric | DEFAULT 0 | Tax % |
| tax_amount | numeric | DEFAULT 0 | Tax amount |
| line_total | numeric | DEFAULT 0 | Line total |
| notes | text | | Notes |
| created_at | timestamptz | DEFAULT now() | Created timestamp |

**Indexes:**
- `idx_sale_order_detail_brand_id` on (brand_id)
- `idx_sale_order_detail_product_id` on (product_id)

---

### sales_inv_hdr_tbl

Invoice headers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| invoice_no | text | UNIQUE, NOT NULL | Invoice number |
| invoice_date | date | NOT NULL | Invoice date |
| order_id | uuid | FK → sale_order_header_tbl(id) | Related order |
| order_no | text | | Order number |
| customer_id | uuid | FK → customer_master_tbl(id), NOT NULL | Customer |
| branch_id | uuid | FK → branch_master_tbl(id) | Branch |
| route_id | uuid | FK → route_master_tbl(id) | Route |
| field_staff_id | uuid | FK → user_master_tbl(id) | Field staff |
| invoice_status | text | DEFAULT 'draft' | Status |
| total_amount | numeric | DEFAULT 0 | Total amount |
| discount_amount | numeric | DEFAULT 0 | Discount |
| tax_amount | numeric | DEFAULT 0 | Tax amount |
| net_amount | numeric | DEFAULT 0 | Net amount |
| created_by | uuid | FK → user_master_tbl(id) | Creator |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Indexes:**
- `idx_invoice_hdr_invoice_no` on (invoice_no)
- `idx_invoice_hdr_customer_id` on (customer_id)
- `idx_sales_inv_hdr_route_id` on (route_id)
- `idx_sales_inv_hdr_field_staff_id` on (field_staff_id)
- `idx_sales_inv_hdr_branch_id` on (branch_id)
- `idx_sales_inv_hdr_created_by` on (created_by)

---

### sales_inv_dtl_tbl

Invoice line items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| invoice_id | uuid | FK → sales_inv_hdr_tbl(id), NOT NULL | Invoice header |
| line_no | integer | NOT NULL | Line number |
| product_id | uuid | FK → product_master_tbl(id), NOT NULL | Product |
| brand_id | uuid | FK → brand_master_tbl(id) | Brand |
| quantity | numeric | NOT NULL | Quantity |
| unit_price | numeric | NOT NULL | Unit price |
| discount_percentage | numeric | DEFAULT 0 | Discount % |
| discount_amount | numeric | DEFAULT 0 | Discount amount |
| tax_percentage | numeric | DEFAULT 0 | Tax % |
| tax_amount | numeric | DEFAULT 0 | Tax amount |
| line_total | numeric | DEFAULT 0 | Line total |
| notes | text | | Notes |

**Indexes:**
- `idx_invoice_dtl_invoice_id` on (invoice_id)
- `idx_invoice_dtl_product_id` on (product_id)
- `idx_sales_inv_dtl_brand_id` on (brand_id)

---

### collection_detail_tbl

Payment collections.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| collection_no | text | UNIQUE, NOT NULL | Collection number |
| collection_date | date | NOT NULL | Collection date |
| customer_id | uuid | FK → customer_master_tbl(id), NOT NULL | Customer |
| branch_id | uuid | FK → branch_master_tbl(id) | Branch |
| route_id | uuid | FK → route_master_tbl(id) | Route |
| field_staff_id | uuid | FK → user_master_tbl(id) | Field staff |
| order_id | uuid | FK → sale_order_header_tbl(id) | Related order |
| payment_mode | text | | Payment mode |
| reference_no | text | | Reference number |
| amount | numeric | DEFAULT 0 | Amount collected |
| remarks | text | | Remarks |
| collected_by | uuid | FK → user_master_tbl(id) | Collector |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Indexes:**
- `idx_collection_collected_by` on (collected_by)
- `idx_collection_branch` on (branch_id)
- `idx_collection_detail_route_id` on (route_id)
- `idx_collection_detail_field_staff_id` on (field_staff_id)
- `idx_collection_detail_order_id` on (order_id)

---

### collection_detail_line_tbl

Multi-line collection details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| collection_id | uuid | FK → collection_detail_tbl(id) | Collection header |
| line_no | integer | | Line number |
| invoice_no | text | | Invoice number |
| invoice_amount | numeric | DEFAULT 0 | Invoice amount |
| collected_amount | numeric | DEFAULT 0 | Collected amount |
| balance_amount | numeric | DEFAULT 0 | Balance |
| operation | text | | add/deduct |
| remarks | text | | Remarks |

**RLS:** Enabled

---

## Mapping Tables

### route_customer_mapping_tbl

Route-customer assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| route_id | uuid | FK → route_master_tbl(id), NOT NULL | Route |
| customer_id | uuid | FK → customer_master_tbl(id), NOT NULL | Customer |
| visit_sequence | integer | DEFAULT 0 | Visit order |
| is_active | boolean | DEFAULT true | Active status |
| created_by | uuid | FK → user_master_tbl(id) | Creator |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Unique Constraint:** (route_id, customer_id)

**Indexes:**
- `idx_route_customer_mapping_route_id` on (route_id)
- `idx_route_customer_mapping_is_active` on (is_active)
- `idx_route_customer_mapping_sequence` on (visit_sequence)
- `idx_route_customer_mapping_created_by` on (created_by)

---

### user_route_mapping_tbl

User-route assignments with day scheduling.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | uuid | FK → user_master_tbl(id), NOT NULL | User |
| route_id | uuid | FK → route_master_tbl(id), NOT NULL | Route |
| day_monday | boolean | DEFAULT false | Monday |
| day_tuesday | boolean | DEFAULT false | Tuesday |
| day_wednesday | boolean | DEFAULT false | Wednesday |
| day_thursday | boolean | DEFAULT false | Thursday |
| day_friday | boolean | DEFAULT false | Friday |
| day_saturday | boolean | DEFAULT false | Saturday |
| day_sunday | boolean | DEFAULT false | Sunday |
| is_active | boolean | DEFAULT true | Active status |
| assigned_by | uuid | FK → user_master_tbl(id) | Assigner |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Unique Constraint:** (user_id, route_id)

**Indexes:**
- `idx_user_route_mapping_user_id` on (user_id)
- `idx_user_route_mapping_route_id` on (route_id)
- `idx_user_route_mapping_is_active` on (is_active)
- `idx_user_route_mapping_assigned_by` on (assigned_by)

---

### customer_user_assignments_tbl

Customer-user assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| customer_id | uuid | FK → customer_master_tbl(id), NOT NULL | Customer |
| user_id | uuid | FK → user_master_tbl(id), NOT NULL | User |
| is_active | boolean | DEFAULT true | Active status |
| assigned_by | uuid | FK → user_master_tbl(id) | Assigner |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Unique Constraint:** (customer_id, user_id)

**Indexes:**
- `idx_customer_user_assignments_user_id` on (user_id)
- `idx_customer_user_assignments_assigned_by` on (assigned_by)

---

## Supporting Tables

### customer_address_tbl

Customer addresses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| customer_id | uuid | FK → customer_master_tbl(id), NOT NULL | Customer |
| address_type | text | | billing/shipping |
| address_line1 | text | | Address line 1 |
| address_line2 | text | | Address line 2 |
| city | text | | City |
| state | text | | State |
| postal_code | text | | Postal code |
| country | text | | Country |
| is_default | boolean | DEFAULT false | Default address |
| created_at | timestamptz | DEFAULT now() | Created timestamp |

**Indexes:**
- `idx_customer_address_customer_id` on (customer_id)

---

### customer_media_tbl

Customer documents and photos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| customer_id | uuid | FK → customer_master_tbl(id), NOT NULL | Customer |
| media_type | text | | photo/document |
| file_url | text | | File URL |
| file_name | text | | File name |
| uploaded_by | uuid | FK → user_master_tbl(id) | Uploader |
| uploaded_at | timestamptz | DEFAULT now() | Upload timestamp |

**Indexes:**
- `idx_customer_media_customer_id` on (customer_id)
- `idx_customer_media_type` on (media_type)
- `idx_customer_media_uploaded_by` on (uploaded_by)

---

### product_price_tbl

Product pricing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| product_id | uuid | FK → product_master_tbl(id), NOT NULL | Product |
| price_type | text | | retail/wholesale |
| unit_price | numeric | NOT NULL | Price |
| effective_from | date | | Effective from |
| effective_to | date | | Effective to |
| is_active | boolean | DEFAULT true | Active status |
| created_at | timestamptz | DEFAULT now() | Created timestamp |

**Indexes:**
- `idx_product_price_product_id` on (product_id)

---

### user_location_tbl

GPS tracking data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | uuid | FK → user_master_tbl(id), NOT NULL | User |
| latitude | numeric | | Latitude |
| longitude | numeric | | Longitude |
| accuracy | numeric | | Accuracy (meters) |
| recorded_at | timestamptz | DEFAULT now() | Timestamp |

**Indexes:**
- `idx_user_location_user_id` on (user_id)

---

### lead_master_tbl & lead_address_tbl

Lead management tables (similar structure to customer tables).

---

## Triggers

### update_updated_at_column()

Automatically updates `updated_at` timestamp on row updates.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

Applied to all tables with `updated_at` column.

---

## Row Level Security

All tables have RLS enabled with permissive policies (`USING (true)`).

Access control is enforced at the application level through:
- AuthContext role checks
- UI component-level authorization
- Protected routes

---

## Indexing Summary

**Total Indexes:** 50+

**Categories:**
1. Primary Keys (automatic)
2. Foreign Keys (manual)
3. Query filters (code, status, date)
4. Sort columns
5. Unique constraints

---

## Data Types

- **UUID**: All primary keys
- **text**: All strings (no varchar limits)
- **numeric**: All numbers (precision/scale as needed)
- **boolean**: Flags and status
- **date**: Date-only fields
- **timestamptz**: Timestamps with timezone

---

## Naming Conventions

- Tables: `[entity]_[type]_tbl` (e.g., `customer_master_tbl`)
- Columns: snake_case (e.g., `customer_name`)
- Indexes: `idx_[table]_[column(s)]`
- Foreign Keys: Auto-named by PostgreSQL
- Constraints: Auto-named by PostgreSQL

---

**Last Updated:** 2025-11-27
**PostgreSQL Version:** 15+
**Supabase Compatible:** Yes
