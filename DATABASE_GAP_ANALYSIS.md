# Database Gap Analysis

## Goal
Ensure that a fresh Hostinger database can support the current application without requiring manual ALTER TABLE steps.

## Findings
The backend uses several tables and columns that are only covered if the database is created from the latest schema. The code already handles missing columns gracefully, but a clean production install should still include the full schema so the admin panel and storefront work predictably.

## Required Tables
- categories
- admin_users
- customers
- addresses
- products
- delivery_zones
- coupons
- orders
- order_items
- payments
- banners
- reviews
- wishlist
- settings
- login_attempts
- uploads

## Notable Columns Required by the Current API
- products.slug, description, ingredients, discount_price, image_url, is_veg, is_featured, is_best_seller, preparation_time, rating, sort_order, stock_status, is_active
- orders.address_id, delivery_landmark, subtotal, delivery_charge, tax_amount, discount_amount, coupon_code, transaction_id, delivery_boy_name, delivery_boy_phone, notes, placed_at, confirmed_at, delivered_at, cancelled_at
- order_items.product_name, product_image, unit_price, total_price
- reviews.order_id, comment, is_approved, updated_at
- settings.group_name
- login_attempts and uploads for auth hardening and media logging

## Production Recommendation
Use 01_FINAL_DATABASE.sql as the single install file for Hostinger. It contains the full schema and safe default data for the current features.

## Risk Level
Low once the new SQL file is imported. The older alter_tables.sql file remains useful only as a migration helper for existing databases that were created earlier.
