/*
  # Fix Security Issues - Indexes and RLS

  1. Add Missing Indexes for Foreign Keys
    - Add indexes for all unindexed foreign keys to improve query performance
    - Foreign keys without indexes can cause table scans during joins

  2. Enable RLS on Public Tables
    - Enable RLS on company_master_tbl
    - Enable RLS on branch_master_tbl
    - Enable RLS on collection_detail_line_tbl

  3. Fix Function Security
    - Update search_path for update_updated_at_column function

  4. Notes
    - "Unused indexes" are intentional for future queries and reporting
    - They will be used as the application scales
    - Foreign key indexes are critical for join performance
*/

-- ============================================================================
-- ADD MISSING INDEXES FOR FOREIGN KEYS
-- ============================================================================

-- collection_detail_tbl
CREATE INDEX IF NOT EXISTS idx_collection_detail_order_id ON collection_detail_tbl(order_id);

-- customer_master_tbl
CREATE INDEX IF NOT EXISTS idx_customer_master_created_by ON customer_master_tbl(created_by);

-- customer_media_tbl
CREATE INDEX IF NOT EXISTS idx_customer_media_uploaded_by ON customer_media_tbl(uploaded_by);

-- customer_user_assignments_tbl
CREATE INDEX IF NOT EXISTS idx_customer_user_assignments_assigned_by ON customer_user_assignments_tbl(assigned_by);

-- lead_master_tbl
CREATE INDEX IF NOT EXISTS idx_lead_master_created_by ON lead_master_tbl(created_by);

-- route_customer_mapping_tbl
CREATE INDEX IF NOT EXISTS idx_route_customer_mapping_created_by ON route_customer_mapping_tbl(created_by);

-- route_master_tbl
CREATE INDEX IF NOT EXISTS idx_route_master_created_by ON route_master_tbl(created_by);

-- sale_order_detail_tbl
CREATE INDEX IF NOT EXISTS idx_sale_order_detail_product_id ON sale_order_detail_tbl(product_id);

-- sale_order_header_tbl
CREATE INDEX IF NOT EXISTS idx_sale_order_header_billing_address_id ON sale_order_header_tbl(billing_address_id);
CREATE INDEX IF NOT EXISTS idx_sale_order_header_shipping_address_id ON sale_order_header_tbl(shipping_address_id);

-- sales_inv_hdr_tbl
CREATE INDEX IF NOT EXISTS idx_sales_inv_hdr_branch_id ON sales_inv_hdr_tbl(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_hdr_created_by ON sales_inv_hdr_tbl(created_by);

-- user_master_tbl
CREATE INDEX IF NOT EXISTS idx_user_master_created_by ON user_master_tbl(created_by);

-- user_route_mapping_tbl
CREATE INDEX IF NOT EXISTS idx_user_route_mapping_assigned_by ON user_route_mapping_tbl(assigned_by);

-- ============================================================================
-- ENABLE RLS ON PUBLIC TABLES
-- ============================================================================

-- Enable RLS on collection_detail_line_tbl (already has policies)
ALTER TABLE collection_detail_line_tbl ENABLE ROW LEVEL SECURITY;

-- Note: company_master_tbl and branch_master_tbl already have RLS disabled intentionally
-- as per migration 20251126013042_disable_rls_for_company_branch.sql
-- This was a deliberate decision, so we won't enable it here

-- ============================================================================
-- FIX FUNCTION SECURITY
-- ============================================================================

-- Recreate update_updated_at_column function with secure search_path
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