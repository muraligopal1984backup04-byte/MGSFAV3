/*
  # Add Bulk Upload Tracking and Product Fields

  1. New Tables
    - `bulk_upload_ref_tbl`
      - `id` (uuid, primary key)
      - `reference_no` (text, unique) - Format: BU-YYYYMMDD-XXXXX
      - `upload_type` (text) - Type of upload (products, invoices, customers, etc.)
      - `total_records` (integer) - Total records in upload
      - `success_records` (integer) - Successfully processed records
      - `failed_records` (integer) - Failed records
      - `uploaded_by` (uuid) - User who uploaded
      - `upload_date` (timestamptz) - When upload occurred
      - `file_name` (text) - Original file name
      - `status` (text) - active, deleted
      - `created_at` (timestamptz)

  2. Changes to product_master_tbl
    - Add `qty_in_ltr` (numeric) - Quantity in liters for oil products
    - Add `bulk_upload_ref` (text) - Reference to bulk upload batch

  3. Security
    - Enable RLS on bulk_upload_ref_tbl
    - Add policies for authenticated users
*/

-- Create bulk upload reference table
CREATE TABLE IF NOT EXISTS bulk_upload_ref_tbl (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no text UNIQUE NOT NULL,
  upload_type text NOT NULL,
  total_records integer DEFAULT 0,
  success_records integer DEFAULT 0,
  failed_records integer DEFAULT 0,
  uploaded_by uuid REFERENCES user_master_tbl(id),
  upload_date timestamptz DEFAULT now(),
  file_name text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bulk_upload_ref_tbl ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bulk uploads"
  ON bulk_upload_ref_tbl FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create bulk uploads"
  ON bulk_upload_ref_tbl FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update bulk uploads"
  ON bulk_upload_ref_tbl FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete bulk uploads"
  ON bulk_upload_ref_tbl FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_master_tbl
      WHERE user_master_tbl.id = auth.uid()
      AND user_master_tbl.role = 'admin'
    )
  );

-- Add new columns to product_master_tbl if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_master_tbl' AND column_name = 'qty_in_ltr'
  ) THEN
    ALTER TABLE product_master_tbl ADD COLUMN qty_in_ltr numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_master_tbl' AND column_name = 'bulk_upload_ref'
  ) THEN
    ALTER TABLE product_master_tbl ADD COLUMN bulk_upload_ref text;
  END IF;
END $$;

-- Add bulk_upload_ref to customer_master_tbl if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_master_tbl' AND column_name = 'bulk_upload_ref'
  ) THEN
    ALTER TABLE customer_master_tbl ADD COLUMN bulk_upload_ref text;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bulk_upload_ref_no ON bulk_upload_ref_tbl(reference_no);
CREATE INDEX IF NOT EXISTS idx_product_bulk_ref ON product_master_tbl(bulk_upload_ref);
CREATE INDEX IF NOT EXISTS idx_customer_bulk_ref ON customer_master_tbl(bulk_upload_ref);
