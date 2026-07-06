# Database Relationship Map – Zaika Lounge

Generated: 2026-06-24

## 1. Tables

| Table | Purpose |
|---|---|
| categories | Menu categories |
| admin_users | Admin authentication and role-based access |
| customers | Customer accounts |
| addresses | Saved delivery addresses per customer |
| products | Menu items/products |
| delivery_zones | Pincode-based delivery charges |
| coupons | Discount coupons |
| orders | Customer orders |
| order_items | Line items within each order |
| payments | Payment attempts / transaction log |
| banners | Homepage promotional banners |
| reviews | Product reviews |
| wishlist | Customer favorite products |
| settings | Key/value application configuration |
| uploads | Uploaded image metadata (via API) |

## 2. Primary Keys

| Table | Primary Key |
|---|---|
| categories | id |
| admin_users | id |
| customers | id |
| addresses | id |
| products | id |
| delivery_zones | id |
| coupons | id |
| orders | id |
| order_items | id |
| payments | id |
| banners | id |
| reviews | id |
| wishlist | id |
| settings | id |
| uploads | id |

## 3. Foreign Keys

| Child Table | Foreign Key | Parent Table | Notes |
|---|---|---|---|
| addresses.customer_id | customers.id | customers | Cascades on delete/update |
| products.category_id | categories.id | categories | Restricts delete |
| orders.customer_id | customers.id | customers | Restricts delete |
| orders.address_id | addresses.id | addresses | Set null on delete |
| order_items.order_id | orders.id | orders | Cascades on delete/update |
| order_items.product_id | products.id | products | Restricts delete |
| payments.order_id | orders.id | orders | Cascades on delete/update |
| payments.customer_id | customers.id | customers | Set null on delete |
| reviews.product_id | products.id | products | Cascades on delete/update |
| reviews.customer_id | customers.id | customers | Cascades on delete/update |
| reviews.order_id | orders.id | orders | Set null on delete |
| wishlist.customer_id | customers.id | customers | Cascades on delete/update |
| wishlist.product_id | products.id | products | Cascades on delete/update |

## 4. Relationships

### Customer domain
- customers 1 — many addresses
- customers 1 — many orders
- customers 1 — many wishlist rows
- customers 1 — many reviews
- customers 1 — many payments (nullable)

### Catalog domain
- categories 1 — many products
- products 1 — many order_items
- products 1 — many reviews
- products 1 — many wishlist rows

### Order domain
- orders 1 — many order_items
- orders 1 — many payments
- orders 1 — many reviews (nullable order_id)
- orders belongs to one customer and optionally one address

### Configuration domain
- settings is a standalone key/value table with no foreign keys
- delivery_zones and coupons are standalone lookup/config tables used during checkout
- banners is standalone content table
- uploads is standalone metadata table for uploaded files

## 5. ERD-Style Text Diagram

```text
+-------------------+        1       +-------------------+
| customers         |<--------------| addresses         |
|-------------------|               |-------------------|
| id (PK)           |               | id (PK)           |
| name              |               | customer_id (FK) |
| email             |               | full_name         |
| phone             |               | address_line      |
| password_hash     |               | pincode           |
| is_active         |               | is_default        |
+-------------------+               +-------------------+
        |                                     |
        | 1                                   | many
        |                                     |
        v                                     v
+-------------------+        1       +-------------------+
| orders            |<--------------| order_items       |
|-------------------|               |-------------------|
| id (PK)           |               | id (PK)           |
| customer_id (FK)  |               | order_id (FK)     |
| address_id (FK)   |               | product_id (FK)   |
| order_number      |               | quantity          |
| total_amount      |               | unit_price        |
| order_status      |               | total_price       |
| payment_status    |               +-------------------+
+-------------------+
        |
        | 1
        v
+-------------------+
| payments          |
|-------------------|
| id (PK)           |
| order_id (FK)     |
| customer_id (FK)  |
| payment_method    |
| amount            |
| status            |
+-------------------+

+-------------------+        1       +-------------------+
| categories        |<--------------| products          |
|-------------------|               |-------------------|
| id (PK)          |               | id (PK)           |
| name             |               | category_id (FK)  |
| slug             |               | name              |
| is_active        |               | price             |
+-------------------+               | stock_status      |
                                   | is_active         |
                                   +-------------------+
                                            |
                                            | 1
                                            v
+-------------------+        1       +-------------------+
| reviews          |<--------------| wishlist          |
|-------------------|               |-------------------|
| id (PK)          |               | id (PK)           |
| product_id (FK)  |               | customer_id (FK)  |
| customer_id (FK) |               | product_id (FK)   |
| order_id (FK)    |               +-------------------+
| rating           |
| comment          |
| is_approved      |
+-------------------+
```

## 6. Missing Indexes

The schema already has the main indexes for primary lookups, but the following query patterns would benefit from additional indexes:

- `orders`: query by `customer_id` + `order_status` + `created_at` together
  - Suggested composite index: `(customer_id, order_status, created_at)`
- `orders`: query by `payment_status` and `created_at`
  - Suggested composite index: `(payment_status, created_at)`
- `orders`: search by `order_number`
  - Already unique, so this is covered
- `products`: filter by `category_id`, `is_active`, `is_featured`, `is_best_seller`, `is_veg`
  - Suggested composite index: `(category_id, is_active, is_featured)`
  - Suggested composite index: `(is_active, is_best_seller)`
- `reviews`: filter by `product_id` and `is_approved`
  - Suggested composite index: `(product_id, is_approved, created_at)`
- `payments`: filter by `customer_id` and `status`
  - Suggested composite index: `(customer_id, status)`
- `addresses`: filter by `customer_id` and `is_default`
  - Suggested composite index: `(customer_id, is_default)`
- `settings`: query by `group_name` and `setting_key`
  - Suggested composite index: `(group_name, setting_key)`

## 7. Missing Foreign Keys

The following relationships are logical but not enforced in the schema:

- `uploads.uploaded_by` points to `admin_users.id` but there is no FK declared.
- `orders.coupon_code` references `coupons.code` conceptually, but the schema does not enforce it as a foreign key.
- `orders.payment_method` and `orders.order_status` use enums, so they are not foreign-key relationships.

## 8. Orphaned Tables / Standalone Tables

These tables do not participate in a foreign-key relationship with another table:

- `delivery_zones` — standalone lookup for pincode-based delivery rules
- `coupons` — standalone discount rules
- `banners` — standalone content table
- `settings` — standalone configuration table
- `uploads` — standalone metadata table

These are not “orphaned” in the sense of broken data, but they are not relationally connected to other core entities.

## 9. Redundant or Potentially Redundant Columns

| Column | Concern |
|---|---|
| `products.name` + `products.slug` | Slug is derived from name and is redundant for display but useful for SEO and URL routing |
| `orders.delivery_name` / `orders.delivery_phone` / `orders.delivery_address` / `orders.delivery_pincode` | These duplicate customer and address data at time of order placement; they are useful for order history snapshots but can be considered denormalized |
| `order_items.product_name`, `order_items.product_image` | These snapshot product information at the moment of purchase; useful for historical integrity but duplicate product metadata |
| `customers.avatar_url` | Not redundant but not used by the core ordering workflow |
| `settings.group_name` | The schema uses a key/value model, so `group_name` is a structural convenience rather than a true relational dependency |

## 10. Observations from the PHP Query Patterns

The PHP API uses the schema in a mostly consistent way:

- Customer and admin auth use `customers` and `admin_users`
- Product listing joins `products` to `categories`
- Orders join `orders` to `order_items`, `products`, `customers`, `coupons`, `delivery_zones`, and `payments`
- Reviews join `reviews` to `products` and `customers`
- Wishlist joins `wishlist` to `products` and `categories`
- Dashboard calculations aggregate from `orders`, `customers`, `products`, `reviews`, and `order_items`

This indicates the schema is centered around the order lifecycle and the catalog, with configuration and content tables as supporting structures.
