export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active?: number;
  created_at?: string;
  last_login_at?: string;
  orders_count?: number;
  total_spent?: number;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'manager' | 'staff';
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  is_active: number;
  product_count?: number;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description?: string;
  ingredients?: string;
  price: number | string;
  discount_price?: number | string | null;
  image_url?: string;
  is_veg: number;
  is_featured: number;
  is_best_seller: number;
  preparation_time: number;
  rating: number | string;
  sort_order: number;
  stock_status: 'in_stock' | 'out_of_stock';
  is_active: number;
  category_name?: string;
  category_slug?: string;
  review_count?: number;
  avg_rating?: number;
}

export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  cta_text?: string;
  sort_order: number;
  is_active: number;
  starts_at?: string;
  ends_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
}

export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing'
  | 'out_for_delivery' | 'delivered' | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cod' | 'upi' | 'razorpay' | 'stripe' | 'whatsapp';

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  address_id?: number;
  delivery_name: string;
  delivery_phone: string;
  delivery_address: string;
  delivery_landmark?: string;
  delivery_pincode: string;
  subtotal: number | string;
  delivery_charge: number | string;
  tax_amount: number | string;
  discount_amount: number | string;
  wallet_discount?: number | string;
  loyalty_points_redeemed?: number;
  loyalty_points_earned?: number;
  happy_hour_discount?: number | string;
  flash_deal_discount?: number | string;
  total_amount: number | string;
  coupon_code?: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_id?: string;
  order_status: OrderStatus;
  notes?: string;
  placed_at?: string;
  confirmed_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface Address {
  id: number;
  customer_id: number;
  label?: string;
  full_name: string;
  phone: string;
  address_line: string;
  landmark?: string;
  city: string;
  state?: string;
  pincode: string;
  is_default: number;
}

export interface Review {
  id: number;
  product_id: number;
  customer_id: number;
  order_id?: number;
  rating: number;
  comment?: string;
  is_approved: number;
  created_at: string;
  customer_name?: string;
  product_name?: string;
}

export interface DeliveryZone {
  id: number;
  name: string;
  area_name?: string;
  pincode: string;
  delivery_charge: number | string;
  min_order_value: number | string;
  estimated_minutes: number;
  is_active: number | string;
}

export interface Coupon {
  id: number;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number | string;
  min_order_value: number | string;
  max_discount?: number | string | null;
  usage_limit: number;
  used_count: number;
  starts_at?: string;
  expires_at?: string;
  is_active: number;
  is_public?: number;
  customer_email?: string;
  customer_phone?: string;
  customer_id?: number | null;
}

export interface Settings {
  restaurant_name?: string;
  restaurant_tagline?: string;
  logo_url?: string;
  primary_color?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  address?: string;
  default_delivery_charge?: string;
  free_delivery_threshold?: string;
  tax_percent?: string;
  currency_code?: string;
  currency_symbol?: string;
  min_order_value?: string;
  enable_razorpay?: string;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  enable_upi?: string;
  upi_id?: string;
  upi_payee_name?: string;
  enable_stripe?: string;
  stripe_publishable_key?: string;
  stripe_secret_key?: string;
  enable_cod?: string;
  enable_whatsapp_order?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  opening_hours?: string;
  footer_text?: string;
  restaurant_is_closed?: string;
  restaurant_closed_message?: string;
}

export interface PaymentMethodOption {
  key: PaymentMethod;
  label: string;
  enabled: boolean;
  description?: string;
  upi_id?: string;
  payee_name?: string;
  key_id?: string;
  publishable_key?: string;
}

export interface DashboardStats {
  total_orders: number;
  today_orders: number;
  pending_orders: number;
  delivered_orders: number;
  total_revenue: number;
  collected_amount?: number;
  pending_amount?: number;
  total_customers: number;
  active_products: number;
  pending_reviews: number;
  // V3 fields
  total_employees?: number;
  low_inventory?: number;
  pending_leaves?: number;
  wallet_liability?: number;
}

export interface DashboardData {
  stats: DashboardStats;
  coupon_insights?: {
    code: string;
    description?: string;
    discount_type: 'percentage' | 'flat';
    discount_value: number | string;
    usage_limit: number;
    used_count: number;
    expires_at?: string;
    is_active: number;
    is_public?: number;
  }[];
  revenue_chart: { d: string; total: number }[];
  top_products: {
    name: string;
    image_url?: string;
    units_sold: number;
    revenue: number;
  }[];
  order_status_counts: Record<string, number>;
  alerts?: { level: string; title: string; message: string; count: number }[];
}

// ============================================================
// V3 Types
// ============================================================

export interface WalletTransaction {
  id: number;
  customer_id: number;
  type: 'credit' | 'debit';
  amount: number | string;
  source: string;
  source_id?: string;
  balance_after: number | string;
  description?: string;
  created_at: string;
}

export interface LoyaltyEntry {
  id: number;
  customer_id: number;
  points: number;
  type: 'earn' | 'redeem';
  source: string;
  description?: string;
  created_at: string;
}

export interface FlashDeal {
  id: number;
  product_id: number;
  product_name?: string;
  product_image?: string;
  deal_price: number | string;
  original_price: number | string;
  start_time: string;
  end_time: string;
  max_quantity: number;
  sold_count: number;
  is_active: number | boolean;
}

export interface HappyHour {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  discount_percent: number | string;
  discount_flat: number | string;
  product_ids?: string | null;
  is_active: number | boolean;
}

export interface SpinWinReward {
  id: number;
  label: string;
  reward_type: 'points' | 'wallet' | 'coupon' | 'free_delivery' | 'none';
  reward_value?: string | null;
  probability_weight: number;
  is_active: number | boolean;
}

export interface Employee {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: 'chef' | 'delivery' | 'manager' | 'waiter' | 'cashier' | 'other';
  salary: number | string;
  joining_date?: string;
  is_active: number | boolean;
  created_at: string;
  attendance_summary?: { present: number; absent: number; half_day: number };
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name?: string;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'leave';
  check_in?: string;
  check_out?: string;
  notes?: string;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  category?: string;
  unit: string;
  current_stock: number | string;
  min_stock_level: number | string;
  cost_per_unit: number | string;
  supplier_id?: number;
  supplier_name?: string;
  is_active: number | boolean;
  created_at: string;
}

export interface InventoryTransaction {
  id: number;
  item_id: number;
  item_name?: string;
  type: 'in' | 'out' | 'adjustment' | 'waste';
  quantity: number | string;
  unit_cost?: number | string;
  notes?: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: number | boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  event_date: string;
  event_type: 'holiday' | 'event' | 'promotion' | 'maintenance' | 'other';
  is_active: number | boolean;
}

export interface Notification {
  id: number;
  user_type: 'customer' | 'admin';
  user_id: number;
  title: string;
  message?: string;
  type: 'order' | 'promo' | 'system' | 'wallet' | 'loyalty';
  is_read: number | boolean;
  data_json?: string;
  created_at: string;
}

