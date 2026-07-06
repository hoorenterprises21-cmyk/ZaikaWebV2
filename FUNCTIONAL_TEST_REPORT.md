# Functional Test Report – Zaika Lounge

Generated: 2026-06-24
Scope: Admin flow, customer flow, and database validation for the Zaika Lounge application.

## Overall Result

Status: FAIL (blocked by environment/runtime issues)

The frontend build is healthy, but the PHP backend and MySQL database required by the requested workflows are not available in the current execution environment. Because of this, the end-to-end admin/customer operations could not be executed successfully.

## Verification Evidence

- Frontend build succeeded with `npm run build`.
- The environment reported: `php not found`.
- The environment reported: `mysql not found` and `mariadb not found`.
- Probing the API endpoint returned the PHP source of [api/v1/auth.php](api/v1/auth.php) instead of JSON. This indicates that the PHP runtime is not being executed by the local environment.

## Admin Flow Validation

| Test | Status | Files involved | API involved | Database tables involved | Root cause if failed |
|---|---|---|---|---|---|
| Admin Login | FAIL | [src/pages/admin/AdminLogin.tsx](src/pages/admin/AdminLogin.tsx), [src/lib/adminAuth.tsx](src/lib/adminAuth.tsx), [api/v1/auth.php](api/v1/auth.php) | POST /api/v1/auth.php?action=admin_login | admin_users | PHP runtime is unavailable and the backend cannot process authentication requests. |
| Upload Product Image | FAIL | [src/components/ImageUpload.tsx](src/components/ImageUpload.tsx), [api/v1/upload.php](api/v1/upload.php) | POST /api/v1/upload.php | uploads | Upload endpoint cannot be executed because the PHP backend is not running. |
| Create Product | FAIL | [src/pages/admin/AdminProducts.tsx](src/pages/admin/AdminProducts.tsx), [api/v1/products.php](api/v1/products.php) | POST /api/v1/products.php | products, categories | Product creation API is not reachable due to missing PHP runtime and database connectivity. |
| Edit Product | FAIL | [src/pages/admin/AdminProducts.tsx](src/pages/admin/AdminProducts.tsx), [api/v1/products.php](api/v1/products.php) | PUT /api/v1/products.php | products | Update endpoint cannot be exercised without a working backend/database. |
| Delete Product | FAIL | [src/pages/admin/AdminProducts.tsx](src/pages/admin/AdminProducts.tsx), [api/v1/products.php](api/v1/products.php) | DELETE /api/v1/products.php | products | Delete endpoint cannot be exercised without a working backend/database. |
| Create Category | FAIL | [src/pages/admin/AdminCategories.tsx](src/pages/admin/AdminCategories.tsx), [api/v1/categories.php](api/v1/categories.php) | POST /api/v1/categories.php | categories | Category creation API is not reachable due to missing PHP runtime and database connectivity. |
| Edit Category | FAIL | [src/pages/admin/AdminCategories.tsx](src/pages/admin/AdminCategories.tsx), [api/v1/categories.php](api/v1/categories.php) | PUT /api/v1/categories.php | categories | Category update API is not reachable due to missing PHP runtime and database connectivity. |
| View Orders | FAIL | [src/pages/admin/AdminOrders.tsx](src/pages/admin/AdminOrders.tsx), [api/v1/orders.php](api/v1/orders.php) | GET /api/v1/orders.php | orders, order_items | Order listing cannot be verified because the backend cannot execute and no database is available. |

## Customer Flow Validation

| Test | Status | Files involved | API involved | Database tables involved | Root cause if failed |
|---|---|---|---|---|---|
| Customer Registration | FAIL | [src/pages/Login.tsx](src/pages/Login.tsx), [src/lib/auth.tsx](src/lib/auth.tsx), [api/v1/auth.php](api/v1/auth.php) | POST /api/v1/auth.php?action=register | customers | Registration endpoint cannot be executed because the PHP backend is unavailable. |
| Customer Login | FAIL | [src/pages/Login.tsx](src/pages/Login.tsx), [src/lib/auth.tsx](src/lib/auth.tsx), [api/v1/auth.php](api/v1/auth.php) | POST /api/v1/auth.php?action=login | customers | Login endpoint cannot be executed because the PHP backend is unavailable. |
| Browse Products | FAIL | [src/pages/Menu.tsx](src/pages/Menu.tsx), [api/v1/products.php](api/v1/products.php) | GET /api/v1/products.php | products, categories | Product listing cannot be loaded because the backend/API layer is not available. |
| Add Product To Cart | FAIL | [src/lib/cart.tsx](src/lib/cart.tsx), [src/pages/Menu.tsx](src/pages/Menu.tsx) | None (client-side state) | None directly | The cart UI depends on product data from the API; with the backend unavailable, the flow cannot be completed end to end. |
| Update Cart Quantity | FAIL | [src/lib/cart.tsx](src/lib/cart.tsx), [src/pages/Cart.tsx](src/pages/Cart.tsx) | None (client-side state) | None directly | The cart UI cannot be populated from the API in the current environment. |
| Checkout | FAIL | [src/pages/Checkout.tsx](src/pages/Checkout.tsx), [api/v1/orders.php](api/v1/orders.php) | POST /api/v1/orders.php | orders, order_items, payments | Checkout cannot proceed because order placement depends on the backend and database. |
| Place Order | FAIL | [src/pages/Checkout.tsx](src/pages/Checkout.tsx), [api/v1/orders.php](api/v1/orders.php) | POST /api/v1/orders.php | orders, order_items, payments | Order placement is blocked by the missing PHP runtime and database access. |
| View Order History | FAIL | [src/pages/Orders.tsx](src/pages/Orders.tsx), [api/v1/orders.php](api/v1/orders.php) | GET /api/v1/orders.php | orders | Order history cannot be fetched because the backend cannot serve the API. |

## Database Validation

| Table | Status | Files involved | Expected validation target | Root cause if failed |
|---|---|---|---|---|
| products | FAIL | [database_schema.sql](database_schema.sql), [api/v1/products.php](api/v1/products.php) | Product inserts/updates/deletes should persist and be retrievable | No reachable MySQL database is present in this environment. |
| categories | FAIL | [database_schema.sql](database_schema.sql), [api/v1/categories.php](api/v1/categories.php) | Category inserts/updates/deletes should persist and be retrievable | No reachable MySQL database is present in this environment. |
| orders | FAIL | [database_schema.sql](database_schema.sql), [api/v1/orders.php](api/v1/orders.php) | Orders should be created with correct totals and status values | No reachable MySQL database is present in this environment. |
| order_items | FAIL | [database_schema.sql](database_schema.sql), [api/v1/orders.php](api/v1/orders.php) | Order lines should be created for each ordered item | No reachable MySQL database is present in this environment. |
| uploads | FAIL | [database_schema.sql](database_schema.sql), [api/v1/upload.php](api/v1/upload.php) | Uploaded files should be recorded with metadata | No reachable MySQL database is present in this environment. |
| customers | FAIL | [database_schema.sql](database_schema.sql), [api/v1/auth.php](api/v1/auth.php) | Customer account registration and login should persist and authenticate | No reachable MySQL database is present in this environment. |

## Notes

- The application source and API contract are present and appear structurally consistent with the intended workflow.
- The key blocker is infrastructure readiness, not the frontend React code itself.
- To complete a true functional validation, the environment needs:
  - a working PHP runtime,
  - a reachable MySQL server,
  - valid database credentials in [api/config/env.php](api/config/env.php), and
  - the schema imported from [database_schema.sql](database_schema.sql).
