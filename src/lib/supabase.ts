import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Product {
  [x: string]: any;
  additional_images?: string[]; // Fixed type
  unit?: string; // Optional
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  discount?: number; // NEW: Discount field
  category: string;
  image_url: string;
  specifications: Record<string, any>;
  stock: number;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  expires_at: any;
  id: string;
  image_url: string;
  link_url: string;
  order_position: number;
  is_active: boolean;
  created_at: string;
}

// Updated Order Interface
export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  special_instructions?: string;
  payment_method: string;
  subtotal_price: number;
  shipping_charge: number;
  total_price: number;
  status: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_title: string;
  quantity: number;
  price_at_purchase: number;
  created_at: string;
}

export interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  image_url?: string;
  product_id?: string;
  created_at: string;
}