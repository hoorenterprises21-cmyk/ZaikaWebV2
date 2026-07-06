# SCHEMA COMPATIBILITY AUDIT

## Column-Existence Helper Functions

### `pcol()` — products.php
| Line | Column Checked | Reason | Can Remove? |
|------|---------------|--------|-------------|
| 11-18 | All product columns | Cache function definition | No (infrastructure) |
| 38-46 | slug, description, image_url, discount_price, is_veg, is_featured, is_best_seller, preparation_time, rating, sort_order, stock_status, is_active, created_at, updated_at | SELECT column list | No — needed for older schemas |
| 50-55 | sort_order | ORDER BY | No |
| 82 | is_active | WHERE filter | No |
| 96-100 | is_featured, is_best_seller, is_veg | WHERE filters | No |
| 153 | All optional columns | INSERT | No |
| 180 | slug | UPDATE | No |
| 192-228 | All columns | UPDATE | No |

### `ocol()` — orders.php
| Line | Column Checked | Reason | Can Remove? |
|------|---------------|--------|-------------|
| 10-18 | Any table.column | Cache function | No (infrastructure) |
| 31-34 | image_url, discount_price, stock_status, is_active | Product SELECT in recompute_totals | No |
| 131-132 | product_name, product_image, unit_price, total_price | Order items SELECT | No |
| 200-201 | address_id, delivery_landmark, coupon_code, notes, placed_at | Order INSERT optionals | No |
| 211-214 | product_name, product_image, unit_price, total_price | Order items INSERT | No |
| 237-238 | gateway, currency | Payment INSERT | No |
| 272-274 | confirmed_at, delivered_at, cancelled_at | Order status UPDATE | No |
| 280-284 | transaction_id, delivery_boy_name, delivery_boy_phone | Order UPDATE | No |

### `rcol()` — reviews.php
| Line | Column Checked | Reason | Can Remove? |
|------|---------------|--------|-------------|
| 10-17 | All review columns | Cache function | No (infrastructure) |
| 24 | is_approved | WHERE filter for approved reviews | No |
| 25 | comment | SELECT inclusion | No |
| 53-54 | is_approved | WHERE filter for admin list | No |
| 56-57 | comment, is_approved | SELECT extras | No |
| 116-118 | order_id, comment, is_approved | INSERT | No |
| 131 | is_approved | UPDATE check | No |

### `col_exists()` — categories.php
| Line | Column Checked | Reason | Can Remove? |
|------|---------------|--------|-------------|
| 11-23 | Any table.column | Cache function | No (infrastructure) |
| 40 | sort_order | ORDER BY | No |
| 46 | is_active | WHERE filter | No |
| 55 | is_active | Product count query | No |
| 77-80 | description, image_url, sort_order, is_active | INSERT | No |
| 105-119 | description, image_url, sort_order, is_active | UPDATE | No |

### `bcol()` — banners.php
| Line | Column Checked | Reason | Can Remove? |
|------|---------------|--------|-------------|
| All | subtitle, link_url, cta_text, sort_order, is_active, starts_at, ends_at | CRUD operations | No |

### `paycol()` — payments.php
| Line | Column Checked | Reason | Can Remove? |
|------|---------------|--------|-------------|
| All | gateway, transaction_id, currency, gateway_response | INSERT | No |

### `zcol()` / `ccol()` — delivery.php
| Line | Column Checked | Reason | Can Remove? |
|------|---------------|--------|-------------|
| All | delivery_charge, min_order_value, estimated_minutes, is_active (zones) | CRUD | No |
| All | description, discount_type, discount_value, min_order_value, max_discount, usage_limit, used_count, starts_at, expires_at, is_active (coupons) | CRUD | No |

## Verdict
**Can any be removed? NO.** All `*col()` / `ocol()` / `col_exists()` guards are needed for backward compatibility with databases that haven't run `alter_tables.sql` yet. Once all production databases are confirmed to have the full schema, these can be simplified — but not before.

## Performance Impact
Each `*col()` call does a `SELECT col FROM table LIMIT 0` query on first call, then caches the result in a static array. This means **one extra query per column per table per request** on first call, then zero overhead for subsequent calls. Acceptable for a shared-hosting restaurant platform.
