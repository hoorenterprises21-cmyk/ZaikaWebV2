# PRODUCT EXECUTION TRACE

## End-to-End Flow

```
AdminProducts.tsx (form submit)
  → [if image selected] ImageUpload.tsx → POST /api/v1/upload.php → returns URL
  → adminApi.post/put('/products.php', payload)
    → products.php
      → require_admin() — validates JWT
      → [POST] unique_slug() — checks slug column exists, generates unique slug
      → pcol() — checks each optional column exists
      → INSERT INTO products (...) VALUES (...)
      → [PUT] unique_slug() — only if name changed
      → UPDATE products SET ... WHERE id = ?
    → JSON response { success: true, id: X, slug: '...' }
  → toast('Product created/updated')
  → load() — refreshes product list
```

---

## 1. Example Create Payload (POST /api/v1/products.php)

**Frontend sends** (AdminProducts.tsx:64-73):
```json
{
  "category_id": 3,
  "name": "Chicken Tikka Masala",
  "price": 249.00,
  "discount_price": 199.00,
  "description": "Grilled chicken in creamy tomato gravy",
  "ingredients": "Chicken, tomato, cream, spices",
  "image_url": "/uploads/upload_20260623_143022_a1b2c3d4e5f6.jpg",
  "is_veg": 0,
  "is_featured": 1,
  "is_best_seller": 0,
  "preparation_time": 25,
  "rating": 4.5,
  "sort_order": 10,
  "stock_status": "in_stock",
  "is_active": 1
}
```

**Note:** `image_url` is optional. If the admin doesn't upload an image, it defaults to `''` (empty string). The product is created successfully without any image.

## 2. Example Update Payload (PUT /api/v1/products.php)

```json
{
  "id": 15,
  "category_id": 3,
  "name": "Chicken Tikka Masala (Large)",
  "price": 299.00,
  "discount_price": null,
  "description": "Grilled chicken in creamy tomato gravy - large portion",
  "ingredients": "Chicken, tomato, cream, spices",
  "image_url": "/uploads/upload_20260623_143022_a1b2c3d4e5f6.jpg",
  "is_veg": 0,
  "is_featured": 1,
  "is_best_seller": 1,
  "preparation_time": 30,
  "rating": 4.6,
  "sort_order": 5,
  "stock_status": "in_stock",
  "is_active": 1
}
```

## 3. Database Columns Used

### products table — INSERT (POST)

| Column | Nullable | Default | Source | Guarded by pcol()? |
|--------|----------|---------|--------|-------------------|
| `category_id` | NO | — | input('category_id') | No (base column) |
| `name` | NO | — | input('name') | No (base column) |
| `price` | NO | 0.00 | input('price') | No (base column) |
| `slug` | NO | — | unique_slug() | Yes — unique_slug() checks table_has_column() first |
| `description` | YES | NULL | input('description') | Yes |
| `ingredients` | YES | NULL | input('ingredients') | Yes |
| `discount_price` | YES | NULL | input('discount_price') | Yes |
| `image_url` | YES | NULL | input('image_url') | Yes |
| `is_veg` | NO | 1 | input('is_veg') | Yes |
| `is_featured` | NO | 0 | input('is_featured') | Yes |
| `is_best_seller` | NO | 0 | input('is_best_seller') | Yes |
| `preparation_time` | NO | 20 | input('preparation_time') | Yes |
| `rating` | NO | 4.0 | input('rating') | Yes |
| `sort_order` | NO | 0 | input('sort_order') | Yes |
| `stock_status` | NO | 'in_stock' | input('stock_status') | Yes |
| `is_active` | NO | 1 | input('is_active') | Yes |
| `created_at` | NO | CURRENT_TIMESTAMP | — | Auto |
| `updated_at` | NO | CURRENT_TIMESTAMP ON UPDATE | — | Auto |

### products table — UPDATE (PUT)

| Column | Source | Guarded by pcol()? |
|--------|--------|-------------------|
| `category_id` | input('category_id') or existing | No (base) |
| `name` | input('name') or existing | No (base) |
| `price` | input('price') or existing | No (base) |
| `slug` | unique_slug() if name changed, else existing | Yes — pcol('slug') + unique_slug() |
| `description` | input('description') | Yes |
| `ingredients` | input('ingredients') | Yes |
| `image_url` | input('image_url') | Yes |
| `discount_price` | input('discount_price') or null | Yes |
| `is_veg` | input('is_veg') or existing | Yes |
| `is_featured` | input('is_featured') or existing | Yes |
| `is_best_seller` | input('is_best_seller') or existing | Yes |
| `preparation_time` | input('preparation_time') or existing | Yes |
| `rating` | input('rating') or existing | Yes |
| `sort_order` | input('sort_order') or existing | Yes |
| `stock_status` | input('stock_status') or existing | Yes |
| `is_active` | input('is_active') or existing | Yes |

## 4. Validation Rules

### Frontend (AdminProducts.tsx:58-61)
- `name` — required (non-empty)
- `category_id` — required (non-zero)
- `price` — required (non-zero)
- `discount_price` — optional, sent as `null` if empty string

### Backend (products.php:122-126)
- `name` — required (truthy check)
- `category_id` — required (cast to int, must be > 0)
- `price` — required (cast to float, must be > 0)
- `category_id` — validated against categories table (must exist)
- `slug` — auto-generated via `slugify(name)` + `unique_slug()` for uniqueness
- `stock_status` — defaults to 'in_stock' (enum: in_stock, out_of_stock)
- `is_veg`, `is_featured`, `is_best_seller`, `is_active` — cast to 0 or 1
- `preparation_time` — cast to int, defaults to 20
- `rating` — cast to float, defaults to 4.0

## 5. Exact Queries Executed

### POST (Create)

**Step 1 — Category validation** (products.php:128-130):
```sql
SELECT id FROM categories WHERE id = ?
-- bound: [3]
```

**Step 2 — Slug uniqueness check** (helpers.php:30-35, called from products.php:132):
```sql
SELECT id FROM `products` WHERE slug = ?
-- bound: ['chicken-tikka-masala']
-- if exists, retries with 'chicken-tikka-masala-2', '-3', etc.
```

**Step 3 — INSERT** (products.php:157-158):
```sql
INSERT INTO products (category_id, name, price, slug, description, ingredients,
  discount_price, image_url, is_veg, is_featured, is_best_seller,
  preparation_time, rating, sort_order, stock_status, is_active)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
-- bound: [3, 'Chicken Tikka Masala', 249.00, 'chicken-tikka-masala',
--   'Grilled chicken in creamy tomato gravy', 'Chicken, tomato, cream, spices',
--   199.00, '/uploads/upload_20260623_143022_a1b2c3d4e5f6.jpg',
--   0, 1, 0, 25, 4.5, 10, 'in_stock', 1]
```

### PUT (Update)

**Step 1 — Fetch existing** (products.php:167-170):
```sql
SELECT * FROM products WHERE id = ?
-- bound: [15]
```

**Step 2 — Slug update** (only if name changed, products.php:180-185):
```sql
SELECT id FROM `products` WHERE slug = ? AND id <> ?
-- bound: ['chicken-tikka-masala-large', 15]
```

**Step 3 — UPDATE** (products.php:231):
```sql
UPDATE products SET
  category_id = ?, name = ?, price = ?, slug = ?,
  description = ?, ingredients = ?, image_url = ?,
  discount_price = ?, is_veg = ?, is_featured = ?, is_best_seller = ?,
  preparation_time = ?, rating = ?, sort_order = ?,
  stock_status = ?, is_active = ?
WHERE id = ?
-- bound: [3, 'Chicken Tikka Masala (Large)', 299.00, 'chicken-tikka-masala-large',
--   'Grilled chicken in creamy tomato gravy - large portion', 'Chicken, tomato, cream, spices',
--   '/uploads/upload_20260623_143022_a1b2c3d4e5f6.jpg',
--   null, 0, 1, 1, 30, 4.6, 5, 'in_stock', 1, 15]
```

---

## Image URL Not Required — CONFIRMED

**Product save works without an image URL.** Here's the proof:

1. **Frontend** (`AdminProducts.tsx:13`): `image_url` defaults to `''` (empty string) in the `empty` form state
2. **Frontend** (`AdminProducts.tsx:185`): `ImageUpload` component is optional — admin can skip it entirely
3. **Backend** (`products.php:143`): `image_url` is in the `$optional` array, guarded by `pcol($db, 'image_url')`
4. **Backend** (`products.php:143`): If the column exists, it inserts `input('image_url', '')` — empty string is a valid value
5. **Database** (`database_schema.sql:104`): `image_url VARCHAR(512) NULL` — nullable, accepts empty string or NULL

**Before the fix:** `unique_slug()` would crash with a PDO exception if the `slug` column was missing, preventing the INSERT from ever executing. This is why product save failed.

**After the fix:** `unique_slug()` calls `table_has_column($db, $table, 'slug')` first. If the column doesn't exist, it returns the base slug without querying. The INSERT then proceeds, and `pcol($db, 'slug')` correctly skips the slug column from the INSERT if it doesn't exist.
