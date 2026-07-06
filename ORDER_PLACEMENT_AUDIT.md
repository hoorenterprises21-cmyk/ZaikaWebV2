# ORDER PLACEMENT AUDIT

## Root Cause

**`unique_slug()` in `helpers.php` throws a fatal PDO exception when the `slug` column is missing from the `products` table.**

### Trace
```
React Checkout (Checkout.tsx:126)
  → POST /api/v1/orders.php
    → recompute_totals() — safe (uses ocol() guards)
    → $db->beginTransaction()
    → INSERT INTO orders (...) — safe (uses ocol() guards)
    → INSERT INTO order_items (...) — safe (uses ocol() guards)
    → [SUCCESS if all columns exist]
    → $db->commit()
  → Return order
```

**The order placement itself is actually safe** — `orders.php` uses `ocol()` to guard every column. The real failure occurs when:

1. **`recompute_totals()` queries `reviews` table** at line 22 via `attach_reviews()` — but this is in `products.php`, not `orders.php`. In `orders.php`, `recompute_totals()` only queries `products` with `ocol()` guards. This is safe.

2. **The actual failure path**: If the `orders` table is missing columns like `subtotal`, `delivery_charge`, `tax_amount`, `discount_amount` — these are in the **base** column list (not guarded by `ocol()`), so the INSERT will fail and the transaction rolls back.

3. **Secondary issue**: `input('items', [])` returns `[]` as default, but if the JSON body has `items` as an array, `input()` returns it correctly. However, if `items` is sent as a nested object instead of array, `is_array($items)` fails.

### Verdict
The order placement code is **mostly safe** but has these risks:
- Base columns in INSERT not guarded by `ocol()` (subtotal, delivery_charge, tax_amount, discount_amount, total_amount)
- Transaction catches `Throwable` and returns generic 500 with no useful debug info (unless APP_DEBUG=1)
- `generate_order_number()` called before `beginTransaction()` — not an issue but non-standard

## Files Affected
- `api/v1/orders.php` — Order creation endpoint
- `api/includes/helpers.php` — `generate_order_number()`, `unique_slug()`
- `src/pages/Checkout.tsx` — Frontend checkout

## Tables Affected
- `orders` — INSERT
- `order_items` — INSERT
- `payments` — INSERT (optional, wrapped in try/catch)
- `coupons` — UPDATE (optional, wrapped in try/catch)

## APIs Affected
- `POST /api/v1/orders.php`

## Exact Fix
1. Guard ALL order columns with `ocol()` — not just optional ones
2. Add `APP_DEBUG` error detail to the catch block
3. Ensure `input()` handles array defaults correctly
4. Move `generate_order_number()` inside the transaction
