import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      company_master_tbl: any;
      branch_master_tbl: any;
      user_master_tbl: any;
      customer_master_tbl: any;
      lead_master_tbl: any;
      product_master_tbl: any;
      brand_master_tbl: any;
      route_master_tbl: any;
      sale_order_header_tbl: any;
      sale_order_detail_tbl: any;
      sales_inv_hdr_tbl: any;
      sales_inv_dtl_tbl: any;
      collection_detail_tbl: any;
      collection_detail_line_tbl: any;
      route_customer_mapping_tbl: any;
      user_route_mapping_tbl: any;
      customer_user_assignments_tbl: any;
      customer_address_tbl: any;
      customer_media_tbl: any;
      lead_address_tbl: any;
      product_price_tbl: any;
      user_location_tbl: any;
    };
  };
}
