# CRUD VALIDATION REPORT

## Products
| Operation | Endpoint | Status | Notes |
|-----------|----------|--------|-------|
| Create | POST /products.php | **BUG** | `unique_slug()` crashes if slug column missing |
| Read (list) | GET /products.php | OK | Uses `pcol()` guards, `product_select_cols()` |
| Read (single) | GET /products.php?id=X | OK | Safe column selection |
| Update | PUT /products.php | **BUG** | `unique_slug()` crashes if slug column missing |
| Delete | DELETE /products.php | OK | Simple prepared statement |

## Categories
| Operation | Endpoint | Status | Notes |
|-----------|----------|--------|-------|
| Create | POST /categories.php | **BUG** | `unique_slug()` crashes if slug column missing |
| Read (list) | GET /categories.php | OK | Uses `col_exists()` guards |
| Read (single) | GET /categories.php?id=X | OK | |
| Update | PUT /categories.php | **BUG** | `unique_slug()` crashes if slug column missing |
| Delete | DELETE /categories.php | OK | Checks for child products first |

## Orders
| Operation | Endpoint | Status | Notes |
|-----------|----------|--------|-------|
| Read (list) | GET /orders.php | OK | Customer/admin scoped |
| Read (single) | GET /orders.php?id=X | OK | Includes items |
| Create | POST /orders.php | OK | Transaction-wrapped, `ocol()` guarded |
| Update status | PUT /orders.php | OK | Validates status enum |
| Delete | DELETE /orders.php | OK | Admin only |

## Customers
| Operation | Endpoint | Status | Notes |
|-----------|----------|--------|-------|
| Read (list) | GET /customers.php | OK | Admin only, paginated |
| Read (single) | GET /customers.php?id=X | OK | Includes order stats |
| Update profile | PUT /customers.php | OK | Customer or admin |
| Update address | PUT /customers.php | OK | Ownership checked |
| Delete customer | DELETE /customers.php | OK | Admin only |
| Add address | POST /customers.php | OK | Customer only |

## Reviews
| Operation | Endpoint | Status | Notes |
|-----------|----------|--------|-------|
| Create | POST /reviews.php | OK | Checks delivered order, prevents duplicates |
| Read (by product) | GET /reviews.php?product_id=X | OK | Only approved reviews |
| Read (all) | GET /reviews.php | OK | Admin only, paginated |
| Approve | PUT /reviews.php | OK | Admin, sets is_approved=1 |
| Reject | PUT /reviews.php | OK | Admin, sets is_approved=0 |
| Delete | DELETE /reviews.php | OK | Admin only |

## Banners
| Operation | Endpoint | Status | Notes |
|-----------|----------|--------|-------|
| Create | POST /banners.php | OK | `bcol()` guarded |
| Read | GET /banners.php | OK | Active/scheduled filtering |
| Update | PUT /banners.php | OK | `bcol()` guarded |
| Delete | DELETE /banners.php | OK | |

## Coupons
| Operation | Endpoint | Status | Notes |
|-----------|----------|--------|-------|
| Create | POST /delivery.php?resource=coupons | OK | `ccol()` guarded |
| Read | GET /delivery.php?resource=coupons | OK | |
| Update | PUT /delivery.php?resource=coupons | OK | `ccol()` guarded |
| Delete | DELETE /delivery.php?resource=coupons | OK | |

## Delivery Zones
| Operation | Endpoint | Status | Notes |
|-----------|----------|--------|-------|
| Create | POST /delivery.php?resource=zones | OK | `zcol()` guarded |
| Read | GET /delivery.php?resource=zones | OK | |
| Update | PUT /delivery.php?resource=zones | OK | `zcol()` guarded |
| Delete | DELETE /delivery.php?resource=zones | OK | |

## Settings
| Operation | Endpoint | Status | Notes |
|-----------|----------|--------|-------|
| Read (public) | GET /settings.php | OK | Filters sensitive keys |
| Read (all) | GET /settings.php?all=1 | OK | Admin, masks secrets |
| Update | PUT /settings.php | OK | Admin, upsert per key |

## Summary
- **4 BUGs** found: `unique_slug()` in products POST/PUT and categories POST/PUT
- All other CRUD operations are functional and safe
