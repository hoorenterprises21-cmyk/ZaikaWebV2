# FoodieHub — Restaurant Ordering & Delivery Platform

A complete, production-ready **Zomato / Swiggy / Uber Eats–style** food-ordering platform
built with **React + Vite + TypeScript + Tailwind** on the frontend and **PHP 8.2 + MySQL 8**
on the backend. Designed to deploy on **Hostinger Shared Hosting** with no VPS, no Docker,
and **no third-party backend services** (no Supabase / Firebase / Appwrite / serverless).

---

## 1. Tech stack

| Layer        | Technology                                                    |
| ------------ | ------------------------------------------------------------- |
| Frontend     | React 18, Vite 5, TypeScript, Tailwind CSS, React Router, Axios |
| Backend      | Pure PHP 8.2+ REST APIs (PDO, no framework)                  |
| Database     | MySQL 8+ (InnoDB, utf8mb4)                                    |
| Auth         | Self-contained JWT (HS256) + `password_hash()` (BCRYPT)      |
| Payments    | COD, UPI, Razorpay, Stripe (toggleable), WhatsApp ordering   |
| Hosting     | Hostinger Shared Hosting (PHP + MySQL + Apache `.htaccess`)  |

Absolutely **no** Supabase, Firebase, Appwrite, PocketBase, MongoDB, Prisma, serverless,
or edge functions are used.

---

## 2. Project structure

```
restaurant-system/
├── public_html/            # Vite build output (deploy this to host)
│   ├── index.html
│   ├── assets/             # compiled JS/CSS
│   ├── favicon.svg
│   └── .htaccess           # SPA fallback + caching + security headers
│
├── api/                    # PHP REST backend (deploy alongside public_html)
│   ├── config/
│   │   ├── env.php         # env loader (merge constants + getenv)
│   │   ├── env.example.php # copy to env.local.php and fill credentials
│   │   └── database.php    # PDO connection
│   ├── includes/           # http, jwt, auth, helpers
│   ├── v1/                 # versioned REST endpoints
│   │   ├── auth.php        # register / login / admin_login / me
│   │   ├── products.php    # menu CRUD + filters
│   │   ├── categories.php  # category CRUD
│   │   ├── orders.php      # place & track orders, admin status
│   │   ├── customers.php   # profile + addresses, admin customer mgmt
│   │   ├── banners.php     # homepage carousel
│   │   ├── reviews.php    # approve / reject / customer reviews
│   │   ├── settings.php   # settings store (public safe view + admin)
│   │   ├── payments.php    # enabled payment methods + log
│   │   ├── delivery.php    # delivery_zones + coupons
│   │   ├── wishlist.php    # customer favourites
│   │   ├── dashboard.php   # admin stats
│   │   └── .htaccess       # protects includes / allows CORS / routing
│   └── bootstrap.php
│
├── public/                 # Vite static source (copied into public_html on build)
│   ├── favicon.svg
│   └── .htaccess
│
├── src/                    # React source
│   ├── components/         # Header, Footer, ProductCard, Toast, WhatsAppButton
│   ├── lib/                # api (axios), auth, cart, adminAuth, settings
│   ├── pages/              # Home, Menu, ProductDetail, Cart, Checkout,
│   │                       #   Orders, Login, Account, Addresses, Wishlist
│   │   └── admin/          # AdminLogin, Layout, Dashboard, Products,
│   │                       #   Categories, Orders, Reviews, Customers,
│   │                       #   Banners, Settings
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
│
├── database_schema.sql     # full schema + seed data + admin user
├── .env                    # frontend env (VITE_API_BASE_URL etc.)
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 3. Database tables (14)

`users`-style entities + supporting tables:

- `admin_users`, `customers`, `addresses`
- `categories`, `products`
- `orders`, `order_items`, `payments`
- `banners`, `reviews`, `wishlist`
- `delivery_zones`, `coupons`, `settings`

Every table has primary keys, foreign keys (with `ON DELETE`/`ON UPDATE` rules),
indexes on hot columns, and `utf8mb4` collation. See [`database_schema.sql`](./database_schema.sql).

---

## 4. Deploy to Hostinger — step by step

### 4.1 Create the database
1. Hostinger **hPanel → Databases → MySQL Databases**.
2. Create a database, e.g. `u123456789_foodiehub`.
3. Create a user, e.g. `u123456789_admin`, grant **all privileges** on the database.
4. Open **phpMyAdmin** for the new database → **Import** → choose `database_schema.sql` → **Go**.
   This creates all tables and the default super-admin.

### 4.2 Build the frontend
On your local machine:
```bash
npm install
npm run build       # outputs into ./public_html
```
Edit `.env` first if your API base URL differs (default `/api/v1` is correct for standard Hostinger layout).

### 4.3 Upload files to Hostinger
In **hPanel → File Manager** open `public_html` and upload:

1. **Everything inside `public_html/`** (the built `index.html`, `assets/`, `.htaccess`, `favicon.svg`)
   directly into the host's `public_html/` directory.
2. Create a folder named `api` inside `public_html` and upload the entire `api/` folder there.

Final on-server layout:
```
public_html/
├── index.html
├── assets/
├── favicon.svg
├── .htaccess               (SPA fallback + caching)
└── api/
    ├── bootstrap.php
    ├── config/
    ├── includes/
    ├── v1/
    └── .htaccess
```

### 4.4 Configure credentials
Either:
- **Option A (recommended):** hPanel → **Advanced → Environment Variables**, add
  `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `JWT_SECRET`, `APP_DEBUG=0`.
- **Option B:** In File Manager, copy `api/config/env.example.php` to
  `api/config/env.local.php` and fill in the values. (`env.local.php` is gitignored.)

### 4.5 Point the frontend to the API
The default `VITE_API_BASE_URL=/api/v1` resolves to `https://yourdomain.com/api/v1/*.php`.
If the API lives on a subdomain or different path, rebuild with the new value in `.env`.

### 4.6 First admin login
- URL: `https://yourdomain.com/admin/login`
- Email: `admin@foodiehub.com`
- Password: `Admin@12345`
- **Change the password immediately** via the database or by editing the `admin_users` row.

---

## 5. API reference

All endpoints return JSON and accept/return `application/json`.
Protected routes require `Authorization: Bearer <jwt>`.

### Auth — `/api/v1/auth.php`
| Method | Action            | Body                                   | Returns      |
| ------ | ----------------- | -------------------------------------- | ------------ |
| POST   | `action=register` | `{name,email,phone,password}`          | token + customer |
| POST   | `action=login`    | `{email,password}`                     | token + customer |
| POST   | `action=admin_login` | `{email,password}`                  | token + admin   |
| GET    | `action=me`       | —                                      | customer profile |

### Catalog
- `GET /v1/products.php` — `?category_id=&search=&is_featured=1&is_best_seller=1&is_veg=1&page=&per_page=`
- `GET /v1/products.php?id=123`
- `POST/PUT/DELETE /v1/products.php` (admin)
- `GET /v1/categories.php`, `POST/PUT/DELETE` (admin)
- `GET /v1/banners.php`, `POST/PUT/DELETE` (admin)

### Orders (customer)
- `POST /v1/orders.php` — body: `{items:[{product_id,quantity}], payment_method, delivery_*,
        coupon_code?, notes?}`. The server recomputes totals; client totals are not trusted.
- `GET /v1/orders.php` — list own orders (customer) or all (admin).
- `GET /v1/orders.php?id=123` — detail.
- `PUT /v1/orders.php` (admin) — `{id, order_status, payment_status, transaction_id}`.

### Customer self-service
- `GET /v1/customers.php?addresses=1` — saved addresses
- `POST /v1/customers.php` — add address
- `PUT /v1/customers.php` — update address or profile
- `DELETE /v1/customers.php?address_id=` — delete address (admin: `?id=` deletes customer)

### Reviews
- `GET /v1/reviews.php?product_id=` — approved reviews for a product
- `POST /v1/reviews.php` — customer submits (requires a delivered order containing the product)
- `PUT /v1/reviews.php` — admin `{id, decision:"approve"|"reject"}`
- `DELETE /v1/reviews.php` — admin

### Payments
- `GET /v1/payments.php?action=methods` — list of enabled methods + public keys
- `POST /v1/payments.php` — record a payment result (called after gateway callback)
- `GET /v1/payments.php` (admin) — transaction log

### Settings
- `GET /v1/settings.php` — safe public settings
- `GET /v1/settings.php?all=1` (admin) — all groups (secrets **masked**)
- `PUT /v1/settings.php` (admin) — JSON body of grouped settings:
  `{"payment":{"enable_cod":"1","enable_upi":"1", ...}}`

### Delivery zones & coupons
- `GET /v1/delivery.php?resource=zones&pincode=`
- `POST/PUT/DELETE` (admin) on both `zones` and `coupons`
- `GET /v1/delivery.php?resource=coupons&code=NEW100` — validate a coupon at checkout

### Wishlist
- `GET/POST/DELETE /v1/wishlist.php`

### Admin dashboard
- `GET /v1/dashboard.php` — totals, 7-day revenue chart, top products, status counts

---

## 6. Admin panel capabilities

Everything persists in MySQL — no file uploads of state.

- **Dashboard** — KPIs, 7-day revenue chart, order-status breakdown, top products.
- **Products** — add / edit / delete, veg vs non-veg, featured, bestseller, discount price,
  stock status, drag-via-sort-order. Search + filter.
- **Categories** — full CRUD with images and active toggle.
- **Orders** — list with status filter, inline status dropdown, detail drawer with item
  breakdown, status update buttons, and **Print Invoice** via the browser.
- **Reviews** — approve / reject / delete with star ratings.
- **Customers** — search, view stats (order count, total spent), block / unblock, delete.
- **Banners** — upload by URL, schedule (`starts_at` / `ends_at`), reorder, activate.
- **Settings** — grouped (general, contact, delivery, payment, social). Toggleable payment
  methods (COD, UPI, Razorpay, Stripe, WhatsApp-order). All secrets are masked in API
  responses and never written back if the masked value is returned.

---

## 7. Payment methods

| Method    | Behaviour                                                                 |
| --------- | ------------------------------------------------------------------------- |
| COD       | Default. Order is recorded as `pending` payment; admin marks `paid` on delivery. |
| UPI       | Admin configures UPI ID + payee name; shown to customer at checkout.      |
| Razorpay  | Enable in settings + add `razorpay_key_id` / `_secret`. The order is      |
|           | created `pending`, and `payments.php` logs the gateway response.          |
| Stripe    | Optional global card flow. Add `stripe_publishable_key` / `_secret`.       |
| WhatsApp  | Builds a formatted order message and opens `wa.me/<configured number>`.   |

All transactions are written to the `payments` table with status, gateway, transaction id,
amount, and raw gateway response for auditing.

---

## 8. WhatsApp integration

- Floating WhatsApp button site-wide (configurable number from admin settings).
- Order-via-WhatsApp payment option at checkout composes a full order summary.
- Customer support chat bubble on every storefront page.

Configured via **Settings → Contact & WhatsApp → whatsapp_number**.

---

## 9. Security

- Passwords hashed with `password_hash()` (BCRYPT).
- JWT (HS256) with `iat`/`exp`; reject on signature mismatch or expiry.
- Two separate token stores: `fh_token` (customer) and `fh_admin_token` (admin)
  with role claims (`type=customer` vs `type=admin`).
- `api/.htaccess` blocks direct access to `config/`, `includes/`, `bootstrap.php`,
  and any `.env`/`.sql`/`.md` files.
- Every API response (including preflight and errors) sets the required CORS headers.
- Settings responses mask secret keys (`razorpay_key_secret`, `stripe_secret_key`).
- Server-side total recomputation: order totals are never trusted from the client;
  the backend recalculates subtotal, delivery, tax, coupon discount, and total.
- No SQL injection — every query uses PDO prepared statements with bound parameters.
- RLS-style ownership checks in PHP (e.g. customers can only read/edit their own
  orders, addresses, and wishlist).

---

## 10. Local development

```bash
npm install
npm run dev        # Vite dev server (frontend only)
```

To exercise the PHP API locally, run PHP's built-in server:
```bash
php -S localhost:8000 -t .
```
Then point `.env` at `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
Create the DB with `mysql -u root -p < database_schema.sql` and configure
`api/config/env.local.php`.

---

## 11. Notes & next steps

- The bundled sample categories/products are for demo only — delete them after import.
- For real Razorpay/Stripe server-side verification, extend `payments.php` to call the
  gateway's verify endpoint using the secret (stored in MySQL `settings` table).
- Image uploads use URL references for simplicity and Hostinger compatibility; to enable
  direct file uploads add a `POST /v1/upload.php` endpoint writing to `public_html/uploads/`.
