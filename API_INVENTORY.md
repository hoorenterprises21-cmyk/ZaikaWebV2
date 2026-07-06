# API Inventory – Zaika Lounge

Generated: 2026-06-24

This document inventories the PHP API endpoints implemented under [api/v1](api/v1).

## Authentication

### 1) Auth – Register customer
- URL: `/api/v1/auth.php?action=register`
- Method: `POST`
- Authentication Required: No
- Request Parameters:
  - `name` (required)
  - `email` (required)
  - `phone` (optional)
  - `password` (required, minimum 6 characters)
- Response Format:
  - `success`, `token`, `customer`
  - Status: `201` on success
- Database Tables Used:
  - `customers`
- Frontend Components Using It:
  - [src/lib/auth.tsx](src/lib/auth.tsx)

### 2) Auth – Customer login
- URL: `/api/v1/auth.php?action=login`
- Method: `POST`
- Authentication Required: No
- Request Parameters:
  - `email` (required)
  - `password` (required)
- Response Format:
  - `success`, `token`, `customer`
  - Status: `200` on success
- Database Tables Used:
  - `customers`
- Frontend Components Using It:
  - [src/lib/auth.tsx](src/lib/auth.tsx)

### 3) Auth – Admin login
- URL: `/api/v1/auth.php?action=admin_login`
- Method: `POST`
- Authentication Required: No
- Request Parameters:
  - `email` (required)
  - `password` (required)
- Response Format:
  - `success`, `token`, `admin`
  - Status: `200` on success
- Database Tables Used:
  - `admin_users`
- Frontend Components Using It:
  - [src/lib/adminAuth.tsx](src/lib/adminAuth.tsx)

### 4) Auth – Current customer profile
- URL: `/api/v1/auth.php?action=me`
- Method: `GET`
- Authentication Required: Yes (customer JWT)
- Request Parameters:
  - None
- Response Format:
  - `success`, `customer`
- Database Tables Used:
  - `customers`
- Frontend Components Using It:
  - [src/lib/auth.tsx](src/lib/auth.tsx)

## Products

### 5) List products / search / filter
- URL: `/api/v1/products.php`
- Method: `GET`
- Authentication Required: No (public), admin for `show_all=1`
- Request Parameters:
  - `id` (optional, fetch one product)
  - `category_id` (optional)
  - `category_slug` (optional)
  - `search` (optional)
  - `is_featured` (optional)
  - `is_best_seller` (optional)
  - `is_veg` (optional)
  - `show_all` (optional, admin-only)
  - `page`, `per_page` (optional)
- Response Format:
  - `success`, `data`, `pagination` for list
  - `success`, `product` for single product
- Database Tables Used:
  - `products`
  - `categories`
  - `reviews`
- Frontend Components Using It:
  - [src/pages/Home.tsx](src/pages/Home.tsx)
  - [src/pages/Menu.tsx](src/pages/Menu.tsx)
  - [src/pages/ProductDetail.tsx](src/pages/ProductDetail.tsx)
  - [src/pages/admin/AdminProducts.tsx](src/pages/admin/AdminProducts.tsx)

### 6) Create product
- URL: `/api/v1/products.php`
- Method: `POST`
- Authentication Required: Yes (admin)
- Request Parameters:
  - `name` (required)
  - `category_id` (required)
  - `price` (required)
  - `description`, `ingredients`, `discount_price`, `image_url`, `is_veg`, `is_featured`, `is_best_seller`, `preparation_time`, `rating`, `sort_order`, `stock_status`, `is_active` (optional)
- Response Format:
  - `success`, `id`, `slug`
  - Status: `201`
- Database Tables Used:
  - `products`
  - `categories`
- Frontend Components Using It:
  - [src/pages/admin/AdminProducts.tsx](src/pages/admin/AdminProducts.tsx)

### 7) Update product
- URL: `/api/v1/products.php`
- Method: `PUT` / `PATCH`
- Authentication Required: Yes (admin)
- Request Parameters:
  - `id` (required)
  - Any mutable product fields
- Response Format:
  - `success`
- Database Tables Used:
  - `products`
- Frontend Components Using It:
  - [src/pages/admin/AdminProducts.tsx](src/pages/admin/AdminProducts.tsx)

### 8) Delete product
- URL: `/api/v1/products.php`
- Method: `DELETE`
- Authentication Required: Yes (admin)
- Request Parameters:
  - `id` (required)
- Response Format:
  - `success`
- Database Tables Used:
  - `products`
- Frontend Components Using It:
  - [src/pages/admin/AdminProducts.tsx](src/pages/admin/AdminProducts.tsx)

## Categories

### 9) List categories
- URL: `/api/v1/categories.php`
- Method: `GET`
- Authentication Required: No (public), admin for `all=1`
- Request Parameters:
  - `id` (optional, fetch one category)
  - `all` (optional, include inactive categories)
- Response Format:
  - `success`, `categories` or `category`
- Database Tables Used:
  - `categories`
  - `products`
- Frontend Components Using It:
  - [src/pages/Home.tsx](src/pages/Home.tsx)
  - [src/pages/Menu.tsx](src/pages/Menu.tsx)
  - [src/pages/admin/AdminCategories.tsx](src/pages/admin/AdminCategories.tsx)

### 10) Create category
- URL: `/api/v1/categories.php`
- Method: `POST`
- Authentication Required: Yes (admin)
- Request Parameters:
  - `name` (required)
  - `description`, `image_url`, `sort_order`, `is_active` (optional)
- Response Format:
  - `success`, `id`, `slug`
  - Status: `201`
- Database Tables Used:
  - `categories`
- Frontend Components Using It:
  - [src/pages/admin/AdminCategories.tsx](src/pages/admin/AdminCategories.tsx)

### 11) Update category
- URL: `/api/v1/categories.php`
- Method: `PUT` / `PATCH`
- Authentication Required: Yes (admin)
- Request Parameters:
  - `id` (required)
  - Any mutable category fields
- Response Format:
  - `success`
- Database Tables Used:
  - `categories`
- Frontend Components Using It:
  - [src/pages/admin/AdminCategories.tsx](src/pages/admin/AdminCategories.tsx)

### 12) Delete category
- URL: `/api/v1/categories.php`
- Method: `DELETE`
- Authentication Required: Yes (admin)
- Request Parameters:
  - `id` (required)
- Response Format:
  - `success`
- Database Tables Used:
  - `categories`
  - `products`
- Frontend Components Using It:
  - [src/pages/admin/AdminCategories.tsx](src/pages/admin/AdminCategories.tsx)

## Orders

### 13) List or fetch orders
- URL: `/api/v1/orders.php`
- Method: `GET`
- Authentication Required: Yes (customer or admin)
- Request Parameters:
  - `id` (optional, fetch a single order)
  - `status` (optional filter)
  - `page`, `per_page` (optional)
- Response Format:
  - `success`, `order` for single order
  - `success`, `data`, `pagination` for list
- Database Tables Used:
  - `orders`
  - `order_items`
- Frontend Components Using It:
  - [src/pages/Orders.tsx](src/pages/Orders.tsx)
  - [src/pages/admin/AdminOrders.tsx](src/pages/admin/AdminOrders.tsx)

### 14) Place order
- URL: `/api/v1/orders.php`
- Method: `POST`
- Authentication Required: Yes (customer)
- Request Parameters:
  - `items` (required array of `{product_id, quantity}`)
  - `payment_method` (required, one of `cod`, `upi`, `razorpay`, `stripe`, `whatsapp`)
  - `delivery_name`, `delivery_phone`, `delivery_address`, `delivery_landmark`, `delivery_pincode`
  - `address_id`, `coupon_code`, `notes`
- Response Format:
  - `success`, `order`
  - Status: `201`
- Database Tables Used:
  - `orders`
  - `order_items`
  - `payments`
  - `products`
  - `coupons`
  - `delivery_zones`
  - `settings`
- Frontend Components Using It:
  - [src/pages/Checkout.tsx](src/pages/Checkout.tsx)

### 15) Update order status / payment status
- URL: `/api/v1/orders.php`
- Method: `PUT` / `PATCH`
- Authentication Required: Yes (admin)
- Request Parameters:
  - `id` (required)
  - `order_status`
  - `payment_status`
  - `transaction_id`
  - `delivery_boy_name`, `delivery_boy_phone`
- Response Format:
  - `success`
- Database Tables Used:
  - `orders`
- Frontend Components Using It:
  - [src/pages/admin/AdminOrders.tsx](src/pages/admin/AdminOrders.tsx)

### 16) Delete order
- URL: `/api/v1/orders.php`
- Method: `DELETE`
- Authentication Required: Yes (admin)
- Request Parameters:
  - `id` (required)
- Response Format:
  - `success`
- Database Tables Used:
  - `orders`
- Frontend Components Using It:
  - [src/pages/admin/AdminOrders.tsx](src/pages/admin/AdminOrders.tsx)

## Customers

### 17) List customers / fetch one / search
- URL: `/api/v1/customers.php`
- Method: `GET`
- Authentication Required: Yes (admin for list/details; customer for addresses)
- Request Parameters:
  - `id` (optional, admin-only detail)
  - `addresses=1` (optional, current customer addresses)
  - `search` (optional, admin-only)
- Response Format:
  - `success`, `customer` or `addresses` or paginated `data`
- Database Tables Used:
  - `customers`
  - `orders`
  - `addresses`
- Frontend Components Using It:
  - [src/pages/Addresses.tsx](src/pages/Addresses.tsx)
  - [src/pages/Checkout.tsx](src/pages/Checkout.tsx)
  - [src/pages/admin/AdminCustomers.tsx](src/pages/admin/AdminCustomers.tsx)

### 18) Create address
- URL: `/api/v1/customers.php`
- Method: `POST`
- Authentication Required: Yes (customer)
- Request Parameters:
  - `full_name`, `phone`, `address_line`, `pincode`, `city`
  - `label`, `landmark`, `state`, `latitude`, `longitude`, `is_default`
- Response Format:
  - `success`, `id`
  - Status: `201`
- Database Tables Used:
  - `addresses`
- Frontend Components Using It:
  - [src/pages/Addresses.tsx](src/pages/Addresses.tsx)

### 19) Update address or profile
- URL: `/api/v1/customers.php`
- Method: `PUT` / `PATCH`
- Authentication Required: Yes (customer or admin)
- Request Parameters:
  - For profile: `name`, `phone`, `avatar_url`
  - For address: `id`, `label`, `full_name`, `phone`, `address_line`, `landmark`, `city`, `state`, `pincode`, `is_default`
- Response Format:
  - `success`
- Database Tables Used:
  - `customers`
  - `addresses`
- Frontend Components Using It:
  - [src/pages/Addresses.tsx](src/pages/Addresses.tsx)
  - [src/pages/admin/AdminCustomers.tsx](src/pages/admin/AdminCustomers.tsx)

### 20) Delete address or customer
- URL: `/api/v1/customers.php`
- Method: `DELETE`
- Authentication Required: Yes (customer for address delete; admin for customer delete)
- Request Parameters:
  - `address_id` (customer delete address)
  - `id` (admin delete customer)
- Response Format:
  - `success`
- Database Tables Used:
  - `addresses`
  - `customers`
- Frontend Components Using It:
  - [src/pages/Addresses.tsx](src/pages/Addresses.tsx)
  - [src/pages/admin/AdminCustomers.tsx](src/pages/admin/AdminCustomers.tsx)

## Reviews

### 21) List product reviews / admin review queue
- URL: `/api/v1/reviews.php`
- Method: `GET`
- Authentication Required: No for public product reviews; admin for queue
- Request Parameters:
  - `product_id` (optional, public list)
  - `id` (optional, review detail)
  - `filter`, `page`, `per_page` (optional, admin)
- Response Format:
  - `success`, `reviews` or `review` or paginated `data`
- Database Tables Used:
  - `reviews`
  - `customers`
  - `products`
- Frontend Components Using It:
  - [src/pages/ProductDetail.tsx](src/pages/ProductDetail.tsx)
  - [src/pages/admin/AdminReviews.tsx](src/pages/admin/AdminReviews.tsx)

### 22) Submit review
- URL: `/api/v1/reviews.php`
- Method: `POST`
- Authentication Required: Yes (customer)
- Request Parameters:
  - `product_id` (required)
  - `order_id` (optional)
  - `rating` (required, 1–5)
  - `comment` (optional)
- Response Format:
  - `success`, `id`, `is_approved`
  - Status: `201`
- Database Tables Used:
  - `reviews`
  - `orders`
  - `order_items`
- Frontend Components Using It:
  - [src/pages/ProductDetail.tsx](src/pages/ProductDetail.tsx)

### 23) Approve or reject review
- URL: `/api/v1/reviews.php`
- Method: `PUT` / `PATCH`
- Authentication Required: Yes (admin)
- Request Parameters:
  - `id` (required)
  - `decision` (`approve` or `reject`)
- Response Format:
  - `success`
- Database Tables Used:
  - `reviews`
- Frontend Components Using It:
  - [src/pages/admin/AdminReviews.tsx](src/pages/admin/AdminReviews.tsx)

### 24) Delete review
- URL: `/api/v1/reviews.php`
- Method: `DELETE`
- Authentication Required: Yes (admin)
- Request Parameters:
  - `id` (required)
- Response Format:
  - `success`
- Database Tables Used:
  - `reviews`
- Frontend Components Using It:
  - [src/pages/admin/AdminReviews.tsx](src/pages/admin/AdminReviews.tsx)

## Settings

### 25) Read settings
- URL: `/api/v1/settings.php`
- Method: `GET`
- Authentication Required: No, but admin gets masked full settings with `all=1`
- Request Parameters:
  - `all=1` (optional, admin-only full view)
- Response Format:
  - `success`, `settings`
- Database Tables Used:
  - `settings`
- Frontend Components Using It:
  - [src/lib/settings.ts](src/lib/settings.ts)
  - [src/pages/admin/AdminSettings.tsx](src/pages/admin/AdminSettings.tsx)
  - [src/components/WhatsAppButton.tsx](src/components/WhatsAppButton.tsx)

### 26) Update settings
- URL: `/api/v1/settings.php`
- Method: `PUT`
- Authentication Required: Yes (admin)
- Request Parameters:
  - JSON body with grouped settings, e.g. `{ "payment": { "enable_cod": "1" } }`
- Response Format:
  - `success`, `message`
- Database Tables Used:
  - `settings`
- Frontend Components Using It:
  - [src/pages/admin/AdminSettings.tsx](src/pages/admin/AdminSettings.tsx)

## Upload

### 27) Upload image
- URL: `/api/v1/upload.php`
- Method: `POST`
- Authentication Required: Yes (admin)
- Request Parameters:
  - Multipart form field `file`
- Response Format:
  - `success`, `url`, `filename`
  - Status: `201`
- Database Tables Used:
  - `uploads`
- Frontend Components Using It:
  - [src/components/ImageUpload.tsx](src/components/ImageUpload.tsx)

## Admin

### 28) Admin banners CRUD
- URL: `/api/v1/banners.php`
- Method: `GET` / `POST` / `PUT` / `DELETE`
- Authentication Required: No for public list; admin for create/update/delete
- Request Parameters:
  - `id` (optional GET)
  - `show_all=1` (optional admin list)
  - CRUD fields such as `title`, `image_url`, `subtitle`, `link_url`, `cta_text`, `sort_order`, `is_active`, `starts_at`, `ends_at`
- Response Format:
  - `success`, `banners` or `banner`
- Database Tables Used:
  - `banners`
- Frontend Components Using It:
  - [src/pages/Home.tsx](src/pages/Home.tsx)
  - [src/pages/admin/AdminBanners.tsx](src/pages/admin/AdminBanners.tsx)

### 29) Delivery zones / coupon management
- URL: `/api/v1/delivery.php?resource=zones` or `/api/v1/delivery.php?resource=coupons`
- Method: `GET` / `POST` / `PUT` / `DELETE`
- Authentication Required: Public GET for pincode/coupon validation; admin for management
- Request Parameters:
  - For zones: `resource=zones`, `id`, `pincode`
  - For coupons: `resource=coupons`, `code`, `id`
- Response Format:
  - `success`, `zone`/`zones` or `coupon`/`coupons`
- Database Tables Used:
  - `delivery_zones`
  - `coupons`
- Frontend Components Using It:
  - [src/pages/Checkout.tsx](src/pages/Checkout.tsx)

### 30) Payment methods / payment callback logging
- URL: `/api/v1/payments.php`
- Method: `GET` / `POST`
- Authentication Required: No for public methods; customer for callback logging; admin for transaction list
- Request Parameters:
  - `action=methods` for public methods
  - `order_id`, `transaction_id`, `status`, `gateway`, `gateway_response` for callback logging
- Response Format:
  - `success`, `methods` or `status`
- Database Tables Used:
  - `payments`
  - `orders`
- Frontend Components Using It:
  - [src/lib/settings.ts](src/lib/settings.ts)
  - [src/pages/Checkout.tsx](src/pages/Checkout.tsx)

### 31) Wishlist operations
- URL: `/api/v1/wishlist.php`
- Method: `GET` / `POST` / `DELETE`
- Authentication Required: Yes (customer)
- Request Parameters:
  - `product_id` for add/remove
- Response Format:
  - `success`, `wishlist` or `in_wishlist`
- Database Tables Used:
  - `wishlist`
  - `products`
  - `categories`
- Frontend Components Using It:
  - [src/pages/Wishlist.tsx](src/pages/Wishlist.tsx)
  - [src/components/ProductCard.tsx](src/components/ProductCard.tsx)

## Dashboard

### 32) Admin dashboard stats
- URL: `/api/v1/dashboard.php`
- Method: `GET`
- Authentication Required: Yes (admin)
- Request Parameters:
  - None
- Response Format:
  - `success`, `stats`, `revenue_chart`, `top_products`, `order_status_counts`
- Database Tables Used:
  - `orders`
  - `customers`
  - `products`
  - `reviews`
  - `order_items`
- Frontend Components Using It:
  - [src/pages/admin/AdminDashboard.tsx](src/pages/admin/AdminDashboard.tsx)
