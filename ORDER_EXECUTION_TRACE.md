# ORDER EXECUTION TRACE

## End-to-End Flow

```
Checkout.tsx (placeOrder)
  → api.post('/orders.php', payload)
    → orders.php POST handler
      → require_customer() — validates customer JWT
      → input('items', []) — extracts cart items array
      → recompute_totals() — server-side price calculation
        → For each item: SELECT from products (ocol-guarded columns)
        → Delivery zone lookup (try/catch)
        → Coupon validation (try/catch)
        → Tax calculation
      → $db->beginTransaction()
        → INSERT INTO orders (...) — ocol-guarded
        → $orderId = lastInsertId()
        → INSERT INTO order_items (...) — ocol-guarded, per item
        → UPDATE coupons SET used_count = used_count + 1 (try/catch)
        → INSERT INTO payments (...) — ocol-guarded (try/catch)
      → $db->commit()
      → SELECT * FROM orders WHERE id = $orderId
      → SELECT * FROM order_items WHERE order_id = ?
      → JSON response { success: true, order: {...} }
  → clear() — clears cart
  → nav(`/orders/${order.id}`) — navigate to order detail
```

---

## 1. Checkout.tsx API Request Payload

**Source:** `Checkout.tsx:108-120`

```json
{
  "items": [
    { "product_id": 3, "quantity": 2 },
    { "product_id": 5, "quantity": 1 }
  ],
  "payment_method": "cod",
  "address_id": null,
  "delivery_name": "Rahul Sharma",
  "delivery_phone": "9876543210",
  "delivery_address": "123 Main Street, Apartment 4B",
  "delivery_landmark": "Near City Mall",
  "delivery_pincode": "251002",
  "delivery_city": "Muzaffarnagar",
  "coupon_code": null,
  "notes": "Ring the bell twice"
}
```

**Note:** `delivery_city` is sent by the frontend but is NOT used by `orders.php` — it's not in the INSERT column list. This is harmless (ignored).

## 2. API Endpoint Called

```
POST /api/v1/orders.php
Authorization: Bearer <customer JWT>
Content-Type: application/json
```

## 3. orders.php POST Handler — Step by Step

### Step 1: Authentication (orders.php:155)
```php
$cust = require_customer();
// Decodes JWT, returns ['id'=>42, 'name'=>'Rahul', 'email'=>'rahul@example.com']
// If no valid token → 401
```

### Step 2: Input Validation (orders.php:156-171)
```php
$items = input('items', []);
// Validates: is_array($items) && count > 0 → else 422 "Cart cannot be empty"

$pm = input('payment_method', 'cod');
// Validates: in_array($pm, ['cod','upi','razorpay','stripe','whatsapp']) → else 422

$address = [
    'name'     => input('delivery_name', $cust['name']),
    'phone'    => input('delivery_phone', ''),
    'address'  => input('delivery_address', ''),
    'landmark' => input('delivery_landmark', ''),
    'pincode'  => input('delivery_pincode', ''),
];
// Validates: phone, address, pincode all non-empty → else 422
```

### Step 3: Server-Side Total Recomputation (orders.php:174)
```php
$totals = recompute_totals($db, $items, $couponCode, $address);
// Never trusts client-submitted prices. Queries each product from DB.
```

**Inside recompute_totals()** (orders.php:21-109):

For each cart item:
```sql
-- ocol-guarded: only includes columns that exist
SELECT id, name, price, image_url, discount_price, stock_status, is_active
FROM products WHERE id = ?
-- bound: [3]
```

Delivery zone lookup:
```sql
-- try/catch wrapped (table may not exist)
SELECT delivery_charge FROM delivery_zones WHERE pincode = ? AND is_active = 1 LIMIT 1
-- bound: ['251002']
```

Coupon validation:
```sql
-- try/catch wrapped (table may not exist)
SELECT * FROM coupons WHERE code = ? AND is_active = 1
-- bound: ['SAVE50']
```

Minimum order check:
```php
$minOrder = (float)setting('min_order_value', '0');
if ($totals['subtotal'] < $minOrder) → 422 "Minimum order value is ₹99"
```

### Step 4: Order Number Generation (orders.php:179)
```php
$orderNumber = generate_order_number();
// Returns: "FH-20260623-A1B2C3D4" (date + 8 hex chars from random_bytes)
```

### Step 5: Transaction Begin (orders.php:183)
```php
$db->beginTransaction();
```

### Step 6: Order INSERT (orders.php:186-206)

**Base columns** (always included):
```sql
INSERT INTO orders (
  order_number, customer_id, delivery_name, delivery_phone,
  delivery_address, delivery_pincode, subtotal, delivery_charge,
  tax_amount, discount_amount, total_amount, payment_method,
  payment_status, order_status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**Bound values:**
```
['FH-20260623-A1B2C3D4', 42, 'Rahul Sharma', '9876543210',
 '123 Main Street, Apartment 4B', '251002',
 598.00, 40.00, 29.90, 0.00, 667.90,
 'cod', 'pending', 'pending']
```

**Optional columns** (added if `ocol()` returns true):
```php
$optionals = [
    'address_id'        => null,
    'delivery_landmark' => 'Near City Mall',
    'coupon_code'      => null,
    'notes'            => 'Ring the bell twice',
    'placed_at'        => '2026-06-23 14:30:22',
];
// Each checked: if (ocol($db, 'orders', $col)) { add to INSERT }
```

### Step 7: Order ID (orders.php:206)
```php
$orderId = (int)$db->lastInsertId();
// e.g., 157
```

### Step 8: Order Items INSERT (orders.php:209-223)

**Base columns:**
```sql
INSERT INTO order_items (order_id, product_id, quantity, product_name, product_image, unit_price, total_price)
VALUES (?, ?, ?, ?, ?, ?, ?)
```

**Per item 1:**
```
[157, 3, 2, 'Margherita Pizza', 'https://images.pexels.com/...', 249.00, 498.00]
```

**Per item 2:**
```
[157, 5, 1, 'Chicken Dum Biryani', 'https://images.pexels.com/...', 189.00, 189.00]
```

**Column inclusion logic:**
```php
if (ocol($db, 'order_items', 'product_name'))  → included
if (ocol($db, 'order_items', 'product_image')) → included
if (ocol($db, 'order_items', 'unit_price'))    → included
if (ocol($db, 'order_items', 'total_price'))   → included
```

### Step 9: Coupon Usage Update (orders.php:226-229)
```sql
-- try/catch wrapped
UPDATE coupons SET used_count = used_count + 1 WHERE code = ?
-- bound: ['SAVE50']
```

### Step 10: Payment Log INSERT (orders.php:233-241)
```sql
-- try/catch wrapped, ocol-guarded
INSERT INTO payments (order_id, customer_id, payment_method, amount, status, gateway, currency)
VALUES (?, ?, ?, ?, ?, ?, ?)
-- bound: [157, 42, 'cod', 667.90, 'initiated', 'cod', 'INR']
```

### Step 11: Transaction Commit (orders.php:243)
```php
$db->commit();
```

### Step 12: Fetch Created Order (orders.php:250-256)
```sql
SELECT * FROM orders WHERE id = 157
```
```sql
SELECT * FROM order_items WHERE order_id = ?
-- bound: [157]
```

### Step 13: Response (orders.php:256)
```json
{
  "success": true,
  "order": {
    "id": 157,
    "order_number": "FH-20260623-A1B2C3D4",
    "customer_id": 42,
    "delivery_name": "Rahul Sharma",
    "delivery_phone": "9876543210",
    "delivery_address": "123 Main Street, Apartment 4B",
    "delivery_pincode": "251002",
    "subtotal": "598.00",
    "delivery_charge": "40.00",
    "tax_amount": "29.90",
    "discount_amount": "0.00",
    "total_amount": "667.90",
    "payment_method": "cod",
    "payment_status": "pending",
    "order_status": "pending",
    "items": [...]
  }
}
```

---

## 4. Error Handling Path (orders.php:244-248)

```php
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    json_response([
        'success' => false,
        'message' => 'Could not place order. Please try again.',
        'debug' => env('APP_DEBUG', '0') === '1' ? $e->getMessage() : null
    ], 500);
}
```

**Flow:**
1. Any `Throwable` (PDOException, TypeError, etc.) inside the try block
2. Check if transaction is active → `rollBack()`
3. Return HTTP 500 with generic message
4. If `APP_DEBUG=1` in env, include the exception message for debugging
5. Frontend catches via `apiError(e, 'Could not place order')` → toast notification

---

## 5. Database Columns Used — Complete Reference

### `orders` table

| Column | Type | Nullable | Default | Used in INSERT? | Guarded by ocol()? |
|--------|------|----------|---------|----------------|-------------------|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | — | Auto (lastInsertId) | — |
| `order_number` | VARCHAR(32) | NO | — | Yes (base) | No |
| `customer_id` | INT UNSIGNED | NO | — | Yes (base) | No |
| `address_id` | INT UNSIGNED | YES | NULL | Yes (optional) | Yes |
| `delivery_name` | VARCHAR(120) | NO | — | Yes (base) | No |
| `delivery_phone` | VARCHAR(20) | NO | — | Yes (base) | No |
| `delivery_address` | TEXT | NO | — | Yes (base) | No |
| `delivery_landmark` | VARCHAR(180) | YES | NULL | Yes (optional) | Yes |
| `delivery_pincode` | VARCHAR(20) | NO | — | Yes (base) | No |
| `subtotal` | DECIMAL(10,2) | NO | 0.00 | Yes (base) | No |
| `delivery_charge` | DECIMAL(10,2) | NO | 0.00 | Yes (base) | No |
| `tax_amount` | DECIMAL(10,2) | NO | 0.00 | Yes (base) | No |
| `discount_amount` | DECIMAL(10,2) | NO | 0.00 | Yes (base) | No |
| `total_amount` | DECIMAL(10,2) | NO | 0.00 | Yes (base) | No |
| `coupon_code` | VARCHAR(40) | YES | NULL | Yes (optional) | Yes |
| `payment_method` | ENUM | NO | 'cod' | Yes (base) | No |
| `payment_status` | ENUM | NO | 'pending' | Yes (base) | No |
| `transaction_id` | VARCHAR(120) | YES | NULL | No (not in POST) | — |
| `order_status` | ENUM | NO | 'pending' | Yes (base) | No |
| `delivery_boy_name` | VARCHAR(120) | YES | NULL | No (not in POST) | — |
| `delivery_boy_phone` | VARCHAR(20) | YES | NULL | No (not in POST) | — |
| `notes` | TEXT | YES | NULL | Yes (optional) | Yes |
| `placed_at` | TIMESTAMP | YES | NULL | Yes (optional) | Yes |
| `confirmed_at` | TIMESTAMP | YES | NULL | No (set on PUT) | — |
| `delivered_at` | TIMESTAMP | YES | NULL | No (set on PUT) | — |
| `cancelled_at` | TIMESTAMP | YES | NULL | No (set on PUT) | — |
| `created_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Auto | — |
| `updated_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | Auto | — |

### `order_items` table

| Column | Type | Nullable | Default | Used in INSERT? | Guarded by ocol()? |
|--------|------|----------|---------|----------------|-------------------|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | — | Auto | — |
| `order_id` | INT UNSIGNED | NO | — | Yes (base) | No |
| `product_id` | INT UNSIGNED | NO | — | Yes (base) | No |
| `product_name` | VARCHAR(160) | NO | — | Yes | Yes |
| `product_image` | VARCHAR(512) | YES | NULL | Yes | Yes |
| `quantity` | INT | NO | 1 | Yes (base) | No |
| `unit_price` | DECIMAL(10,2) | NO | 0.00 | Yes | Yes |
| `total_price` | DECIMAL(10,2) | NO | 0.00 | Yes | Yes |
| `created_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Auto | — |

### `payments` table (optional, try/catch)

| Column | Type | Nullable | Default | Used in INSERT? | Guarded by ocol()? |
|--------|------|----------|---------|----------------|-------------------|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | — | Auto | — |
| `order_id` | INT UNSIGNED | NO | — | Yes (base) | No |
| `customer_id` | INT UNSIGNED | YES | NULL | Yes (base) | No |
| `payment_method` | ENUM | NO | — | Yes (base) | No |
| `gateway` | VARCHAR(40) | YES | NULL | Yes | Yes |
| `transaction_id` | VARCHAR(160) | YES | NULL | No | — |
| `amount` | DECIMAL(10,2) | NO | 0.00 | Yes (base) | No |
| `currency` | CHAR(3) | NO | 'INR' | Yes | Yes |
| `status` | ENUM | NO | 'initiated' | Yes (base) | No |
| `gateway_response` | TEXT | YES | NULL | No | — |
| `created_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Auto | — |
| `updated_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP ON UPDATE | Auto | — |

### `coupons` table (optional, try/catch)

| Column | Type | Nullable | Default | Used in UPDATE? |
|--------|------|----------|---------|----------------|
| `used_count` | INT | NO | 0 | Yes — `used_count = used_count + 1` |

### `products` table (read-only, in recompute_totals)

| Column | Type | Nullable | Default | Used in SELECT? | Guarded by ocol()? |
|--------|------|----------|---------|----------------|-------------------|
| `id` | INT UNSIGNED | NO | — | Yes (base) | No |
| `name` | VARCHAR(160) | NO | — | Yes (base) | No |
| `price` | DECIMAL(10,2) | NO | 0.00 | Yes (base) | No |
| `image_url` | VARCHAR(512) | YES | NULL | Yes | Yes |
| `discount_price` | DECIMAL(10,2) | YES | NULL | Yes | Yes |
| `stock_status` | ENUM | NO | 'in_stock' | Yes | Yes |
| `is_active` | TINYINT(1) | NO | 1 | Yes | Yes |

### `delivery_zones` table (read-only, try/catch)

| Column | Type | Nullable | Default | Used in SELECT? |
|--------|------|----------|---------|----------------|
| `delivery_charge` | DECIMAL(10,2) | NO | 0.00 | Yes |
| `pincode` | VARCHAR(20) | NO | — | Yes (WHERE) |
| `is_active` | TINYINT(1) | NO | 1 | Yes (WHERE) |

---

## 6. Root Cause of Pre-Fix Order Failures

### The Bug

**`unique_slug()` in `helpers.php` (pre-fix) executed a SQL query without checking if the `slug` column existed:**

```php
// BEFORE FIX (helpers.php, old version):
function unique_slug(PDO $db, string $table, string $base, int $exceptId = 0): string {
    $slug = $base;
    $i = 1;
    while (true) {
        $sql = "SELECT id FROM `{$table}` WHERE slug = ?" . ($exceptId ? " AND id <> ?" : "");
        // ↑ If `slug` column doesn't exist → PDOException: "Unknown column 'slug'"
        $stmt = $db->prepare($sql);
        $stmt->execute([$slug]);
        if (!$stmt->fetch()) return $slug;
        $slug = $base . '-' . (++$i);
    }
}
```

### Why This Affected Orders

**It didn't directly affect `orders.php`** — `orders.php` doesn't call `unique_slug()`. The order placement code itself was already safe with `ocol()` guards.

**However**, the same bug affected `products.php:132` and `categories.php:71`, which meant:
1. Admin couldn't create new products (POST /products.php crashed at `unique_slug()`)
2. Admin couldn't update products (PUT /products.php crashed at `unique_slug()`)
3. Admin couldn't create/update categories
4. Without products in the database, customers had nothing to order
5. The order placement flow appeared broken because the prerequisite (products) couldn't be managed

### The Fix

```php
// AFTER FIX (helpers.php, current version):
function table_has_column(PDO $db, string $table, string $col): bool {
    static $cache = [];
    $k = "$table.$col";
    if (!isset($cache[$k])) {
        try { $db->query("SELECT `$col` FROM `$table` LIMIT 0"); $cache[$k] = true; }
        catch (PDOException $e) { $cache[$k] = false; }
    }
    return $cache[$k];
}

function unique_slug(PDO $db, string $table, string $base, int $exceptId = 0): string {
    if (!table_has_column($db, $table, 'slug')) return $base;
    // ↑ If slug column doesn't exist, return base slug without querying
    $slug = $base;
    $i = 1;
    while (true) {
        $sql = "SELECT id FROM `{$table}` WHERE slug = ?" . ($exceptId ? " AND id <> ?" : "");
        $stmt = $db->prepare($sql);
        if ($exceptId) $stmt->execute([$slug, $exceptId]);
        else $stmt->execute([$slug]);
        if (!$stmt->fetch()) return $slug;
        $slug = $base . '-' . (++$i);
    }
}
```

### Secondary Issue in orders.php

The `orders` table INSERT has **base columns** (subtotal, delivery_charge, tax_amount, discount_amount, total_amount) that are NOT guarded by `ocol()`. If any of these columns are missing from the database, the INSERT will fail and the transaction rolls back. This is acceptable because these columns are defined in `database_schema.sql` as NOT NULL with defaults — any database running the schema will have them.

### Summary

| Issue | Affected | Root Cause | Fix |
|-------|----------|------------|-----|
| Product create fails | products.php POST | `unique_slug()` crashes on missing slug column | `table_has_column()` guard added |
| Product update fails | products.php PUT | Same | Same fix applies |
| Category create fails | categories.php POST | Same | Same fix applies |
| Category update fails | categories.php PUT | Same | Same fix applies |
| Order placement | orders.php POST | Not directly affected, but blocked by lack of products | Fixed indirectly by fixing product management |
