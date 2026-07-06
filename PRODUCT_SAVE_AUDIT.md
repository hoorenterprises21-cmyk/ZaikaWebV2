# PRODUCT SAVE AUDIT

## Root Cause

**`unique_slug()` in `helpers.php:16-27` executes `SELECT id FROM products WHERE slug = ?` without checking if the `slug` column exists.** When the column is missing, PDO throws `SQLSTATE[42S22]: Column not found: 1054 Unknown column 'slug'`, which is a fatal uncaught exception.

### Trace
```
React AdminProducts (AdminProducts.tsx:62-80)
  → POST/PUT /api/v1/products.php
    → input('name') — safe
    → (int)input('category_id') — safe
    → unique_slug($db, 'products', slugify($name))  ← FATAL if slug column missing
      → SELECT id FROM `products` WHERE slug = ?  ← PDOException
    → [never reaches INSERT]
```

### Secondary Issue
In `products.php:132`, `unique_slug()` is called **before** the `pcol()` guarded INSERT. The `pcol()` check at line 153 (`if (pcol($db, $col))`) would skip `slug` from the INSERT if the column doesn't exist — but `unique_slug()` already crashed before reaching that point.

### Same bug in `categories.php:71`
```php
$slug = unique_slug($db, 'categories', slugify($name));  // ← crashes if slug column missing
```

## Files Affected
- `api/includes/helpers.php` — `unique_slug()` function (lines 16-27)
- `api/v1/products.php` — POST (line 132), PUT (line 182)
- `api/v1/categories.php` — POST (line 71), PUT (line 99)

## Tables Affected
- `products` — INSERT, UPDATE
- `categories` — INSERT, UPDATE

## APIs Affected
- `POST /api/v1/products.php`
- `PUT /api/v1/products.php`
- `POST /api/v1/categories.php`
- `PUT /api/v1/categories.php`

## Exact Fix
1. Add a `column_exists()` helper to `helpers.php` that checks if a column exists before querying it
2. Make `unique_slug()` check if the `slug` column exists; if not, return the slug without uniqueness check
3. This preserves backward compatibility — if the column exists, behavior is unchanged
