# PROJECT KNOWLEDGE BASE — Zaika Lounge

## 1. Folder Structure
```
/
├── src/                          # React frontend source
│   ├── App.tsx                   # Router + providers
│   ├── main.tsx                  # Entry point
│   ├── types.ts                  # TypeScript interfaces
│   ├── index.css                 # Tailwind + custom styles
│   ├── components/               # Shared UI components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductCard.tsx
│   │   ├── Toast.tsx
│   │   ├── Loader.tsx
│   │   └── WhatsAppButton.tsx
│   ├── lib/                      # State + API layer
│   │   ├── api.ts                # Axios instances (customer + admin)
│   │   ├── auth.tsx              # Customer auth context
│   │   ├── adminAuth.tsx         # Admin auth context
│   │   ├── cart.tsx              # Cart context (localStorage)
│   │   ├── settings.ts           # Settings fetcher + money helpers
│   │   └── staticData.ts         # Fallback static data
│   └── pages/                    # Route views
│       ├── Home.tsx
│       ├── Menu.tsx
│       ├── ProductDetail.tsx
│       ├── Cart.tsx
│       ├── Checkout.tsx
│       ├── Login.tsx
│       ├── Account.tsx
│       ├── Orders.tsx
│       ├── Addresses.tsx
│       ├── Wishlist.tsx
│       └── admin/                # Admin panel
│           ├── AdminLayout.tsx
│           ├── AdminLogin.tsx
│           ├── AdminDashboard.tsx
│           ├── AdminProducts.tsx
│           ├── AdminCategories.tsx
│           ├── AdminOrders.tsx
│           ├── AdminReviews.tsx
│           ├── AdminCustomers.tsx
│           ├── AdminBanners.tsx
│           └── AdminSettings.tsx
├── api/                          # PHP REST API
│   ├── bootstrap.php             # Autoloader + preflight
│   ├── .htaccess                 # Route rewriting + security
│   ├── config/
│   │   ├── database.php          # PDO connection
│   │   ├── env.php               # Environment loader
│   │   └── env.example.php       # Template for env.local.php
│   ├── includes/
│   │   ├── auth.php              # require_customer/require_admin
│   │   ├── helpers.php           # slug, paginate, settings cache
│   │   ├── http.php              # CORS, JSON I/O, input()
│   │   └── jwt.php               # Pure PHP HS256 JWT
│   └── v1/                       # API endpoints
│       ├── auth.php              # Register, login, admin login, me
│       ├── products.php          # Product CRUD
│       ├── categories.php        # Category CRUD
│       ├── orders.php            # Order create, list, update status
│       ├── customers.php         # Customer profile + addresses
│       ├── payments.php          # Payment methods + log
│       ├── reviews.php           # Review create, approve, delete
│       ├── banners.php           # Banner CRUD
│       ├── delivery.php          # Delivery zones + coupons
│       ├── dashboard.php         # Admin dashboard stats
│       ├── settings.php          # Settings get/put
│       └── wishlist.php           # Wishlist add/remove
├── public_html/                  # Vite build output (deployed to Hostinger)
├── public/                       # Static assets (favicon)
├── database_schema.sql           # Full schema + seed data
├── alter_tables.sql              # Migration for missing columns
├── .env                          # Vite env vars
├── vite.config.ts                # Vite config (base: './', outDir: public_html)
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 2. Technology Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| Icons | lucide-react |
| Routing | react-router-dom 6 |
| HTTP | axios |
| Backend | PHP 8+ (pure, no framework) |
| Database | MySQL 8.0+ (utf8mb4) |
| Auth | Pure PHP JWT (HS256, no library) |
| Hosting | Hostinger Shared Hosting |

## 3. Frontend Architecture
- **Providers:** ToastProvider → AuthProvider → CartProvider → AdminAuthProvider → BrowserRouter
- **Two Axios instances:** `api` (customer JWT from `fh_token`) and `adminApi` (admin JWT from `fh_admin_token`)
- **Cart:** localStorage-based, no backend persistence until checkout
- **Settings:** Fetched once, cached in module-level variable, falls back to hardcoded defaults
- **Static fallback data:** `staticData.ts` provides banners, categories, products if API fails

## 4. Backend Architecture
- **No framework** — each endpoint is a standalone PHP file
- `bootstrap.php` loads config, helpers, and handles CORS preflight
- `env.php` reads from PHP constants (defined in `env.local.php`) or `getenv()`
- `database.php` creates a singleton PDO connection
- `jwt.php` implements HS256 encode/decode without external libraries
- `auth.php` resolves JWT → customer/admin arrays
- `http.php` handles JSON I/O, CORS, and `input()` which reads from GET/POST/JSON body
- Each endpoint uses `method()` switch for RESTful dispatch

## 5. Database Architecture
**13 tables:**
| Table | Purpose |
|-------|---------|
| categories | Menu categories |
| products | Food items |
| admin_users | Admin accounts |
| customers | End-user accounts |
| addresses | Delivery addresses |
| orders | Order headers |
| order_items | Order line items |
| payments | Payment transaction log |
| banners | Homepage carousel |
| reviews | Product reviews |
| delivery_zones | Pincode-based delivery charges |
| coupons | Discount codes |
| wishlist | Customer favorites |
| settings | Key-value config store |

**Relationships:**
- products → categories (FK, RESTRICT)
- orders → customers (FK, RESTRICT)
- orders → addresses (FK, SET NULL)
- order_items → orders (FK, CASCADE)
- order_items → products (FK, RESTRICT)
- payments → orders (FK, CASCADE)
- reviews → products, customers, orders (FKs)
- wishlist → customers, products (FKs)
- addresses → customers (FK, CASCADE)

## 6. API Inventory
| Endpoint | Methods | Auth | Purpose |
|----------|---------|------|---------|
| auth.php | GET, POST | Public | Register, login, admin login, profile |
| products.php | GET, POST, PUT, DELETE | GET=public, CUD=admin | Product CRUD |
| categories.php | GET, POST, PUT, DELETE | GET=public, CUD=admin | Category CRUD |
| orders.php | GET, POST, PUT, DELETE | GET=customer/admin, POST=customer, PUT/DELETE=admin | Order management |
| customers.php | GET, POST, PUT, DELETE | Mixed | Profile, addresses, admin customer mgmt |
| payments.php | GET, POST | GET=admin, POST=customer | Payment methods + log |
| reviews.php | GET, POST, PUT, DELETE | GET=public/admin, POST=customer, PUT/DELETE=admin | Review management |
| banners.php | GET, POST, PUT, DELETE | GET=public, CUD=admin | Banner CRUD |
| delivery.php | GET, POST, PUT, DELETE | GET=public/admin, CUD=admin | Zones + coupons |
| dashboard.php | GET | Admin | Dashboard stats |
| settings.php | GET, PUT | GET=public/admin, PUT=admin | Settings |
| wishlist.php | GET, POST, DELETE | Customer | Wishlist |

## 7. Authentication Flow
**Customer:**
1. POST `/auth.php?action=login` with email/password
2. PHP verifies bcrypt hash, returns JWT (`type: customer`)
3. Frontend stores in `localStorage['fh_token']`
4. Axios interceptor attaches `Authorization: Bearer <token>`
5. `require_customer()` decodes JWT, returns customer array

**Admin:**
1. POST `/auth.php?action=admin_login` with email/password
2. PHP verifies against `admin_users` table, returns JWT (`type: admin`)
3. Frontend stores in `localStorage['fh_admin_token']`
4. `adminApi` interceptor attaches token
5. `require_admin()` decodes JWT, returns admin array

**JWT Structure:** `{type, sub, email, name, [role], iat, exp}` — HS256 signed, 7-day TTL

## 8. Admin Modules
- Dashboard: stats, revenue chart, top products, order status counts
- Products: full CRUD with category filter, search, image URL
- Categories: CRUD with slug, sort order, active toggle
- Orders: list with status filter, update status, view detail
- Reviews: list, approve/reject, delete
- Customers: list, search, toggle active, view detail
- Banners: CRUD with image URL, sort order, scheduling
- Settings: grouped form (general, contact, delivery, payment, social)

## 9. Customer Modules
- Home: banners, featured products, categories
- Menu: product grid with category/search/veg filters
- Product Detail: images, description, reviews, add to cart
- Cart: quantity adjust, remove, subtotal
- Checkout: address selection/entry, payment method, coupon, place order
- Account: profile edit, address management
- Orders: order history, order detail
- Wishlist: saved products
- Login/Register: email + password

## 10. Checkout Flow
1. Cart items → Checkout page
2. Select/enter delivery address
3. Choose payment method (COD, UPI, WhatsApp, Razorpay, Stripe)
4. Optional coupon code
5. POST `/orders.php` with items, address, payment method
6. PHP recomputes totals server-side (never trusts client)
7. Transaction: insert order → insert order_items → update coupon → log payment
8. Return order with items
9. Frontend clears cart, navigates to order detail
10. WhatsApp method opens wa.me link with order summary

## 11. Order Flow
```
pending → confirmed → preparing → out_for_delivery → delivered
                    ↘ cancelled
```
- Customer creates order (status: pending, payment: pending)
- Admin updates status via PUT `/orders.php`
- Timestamps set automatically (confirmed_at, delivered_at, cancelled_at)

## 12. Payment Flow
- COD: order placed, payment_status stays pending until delivery
- UPI: order placed, UPI ID shown to customer, manual confirmation
- WhatsApp: order placed, WhatsApp message with order details
- Razorpay/Stripe: order placed, payment logged as 'initiated', gateway SDK (not yet wired)
- Payment POST `/payments.php`: updates payment_status + order_status

## 13. WhatsApp Flow
- WhatsApp button on storefront (floating)
- WhatsApp payment method at checkout
- `buildWhatsAppOrderText()` constructs message with order number, items, totals
- Opens `https://wa.me/<number>?text=<encoded message>`

## 14. Environment Variables
**Frontend (.env):**
- `VITE_API_BASE_URL` — API base path (default: `/api/v1`)
- `VITE_CURRENCY_SYMBOL` — Currency symbol (default: ₹)

**Backend (api/config/env.local.php):**
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` — MySQL credentials
- `JWT_SECRET` — JWT signing secret
- `APP_DEBUG` — Show detailed errors (0/1)

## 15. Build Process
```bash
npm install
npm run build    # Vite builds to public_html/
npm run typecheck # TypeScript check
npm run lint     # ESLint
```
Output: `public_html/` with `index.html` + `assets/` folder

## 16. Deployment Process
1. Run `npm run build` → outputs to `public_html/`
2. Upload `public_html/` contents to Hostinger `public_html/`
3. Upload `api/` folder to `public_html/api/`
4. Create `api/config/env.local.php` with real DB credentials + JWT secret
5. Import `database_schema.sql` via phpMyAdmin
6. Run `alter_tables.sql` if upgrading from older schema
7. Ensure `uploads/` directory exists with write permissions (755)
