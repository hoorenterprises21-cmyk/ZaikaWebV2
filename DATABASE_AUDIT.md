# DATABASE AUDIT

## Tables (13 total)

| Table | PK | Columns | FKs | Indexes |
|-------|----|---------|-----|---------|
| categories | id | 8 | 0 | slug (unique), is_active |
| admin_users | id | 8 | 0 | email (unique), role |
| customers | id | 9 | 0 | email (unique), phone |
| addresses | id | 13 | customer_id→customers | customer_id |
| products | id | 16 | category_id→categories | slug (unique), category_id, is_active, is_featured |
| delivery_zones | id | 9 | 0 | pincode (unique) |
| coupons | id | 13 | 0 | code (unique), is_active |
| orders | id | 22 | customer_id→customers, address_id→addresses | order_number (unique), customer_id, order_status, payment_status, created_at |
| order_items | id | 9 | order_id→orders, product_id→products | order_id, product_id |
| payments | id | 11 | order_id→orders, customer_id→customers | order_id, customer_id, status |
| banners | id | 11 | 0 | is_active |
| reviews | id | 8 | product_id→products, customer_id→customers, order_id→orders | product_id, customer_id, is_approved |
| wishlist | id | 4 | customer_id→customers, product_id→products | (customer_id, product_id) unique, product_id |
| settings | id | 5 | 0 | setting_key (unique), group_name |

## Schema Issues Found

### 1. Missing Indexes
- `order_items.product_id` has index but `order_items.order_id` could benefit from composite
- `reviews.product_id + is_approved` composite index missing (frequent query)
- `orders.created_at` has index (good for dashboard)

### 2. Schema Mismatches (PHP vs SQL)
- `database_schema.sql` seed data has categories: Burgers, Pizza, Biryani, Desserts, Beverages
- `alter_tables.sql` seed data has categories: Starters, Biryani, Curries, Breads, Kebabs, Desserts, Beverages
- **Conflict**: Running both will cause duplicate key errors on category IDs

### 3. Redundant Columns
- `products.rating` column stores a static rating, but `reviews` table computes actual ratings
- `order_items.product_name` and `product_image` duplicate data from `products` table (intentional for historical orders — acceptable)

### 4. Missing Tables
- `login_attempts` — needed for rate limiting (see Security Audit)
- No `uploads` table — images stored as file paths in product/banner/category columns

### 5. Potential Issues
- `settings` table has no `created_at` column (only `updated_at`)
- `order_items` has no `updated_at` (acceptable — immutable after creation)
- `payments.status` enum includes 'initiated' but `orders.payment_status` does not — slight mismatch

## database_fix.sql
The existing `alter_tables.sql` handles all missing column scenarios. Additional fixes needed:

```sql
-- Add login_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `identifier` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `success` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_identifier` (`identifier`),
  KEY `idx_login_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add composite index for review queries
CREATE INDEX IF NOT EXISTS `idx_review_product_approved`
  ON `reviews` (`product_id`, `is_approved`);

-- Add uploads tracking table
CREATE TABLE IF NOT EXISTS `uploads` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `filename` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` INT UNSIGNED NOT NULL DEFAULT 0,
  `uploaded_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_uploads_filename` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
