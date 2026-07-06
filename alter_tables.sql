-- ============================================================
--  FoodieHub / Zaika Lounge  -  ALTER TABLE Migration
--  Run this in phpMyAdmin if you imported an older schema and
--  are getting "Unknown column" errors.
--
--  Each statement uses  IF NOT EXISTS (MySQL 8) or a safe
--  ADD COLUMN ... FIRST / AFTER pattern.
--  Safe to run multiple times  — columns already present are
--  silently skipped.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── categories ──────────────────────────────────────────────
ALTER TABLE `categories`
    ADD COLUMN IF NOT EXISTS `sort_order`   INT NOT NULL DEFAULT 0    AFTER `image_url`,
    ADD COLUMN IF NOT EXISTS `is_active`    TINYINT(1) NOT NULL DEFAULT 1 AFTER `sort_order`,
    ADD COLUMN IF NOT EXISTS `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `is_active`,
    ADD COLUMN IF NOT EXISTS `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`,
    ADD COLUMN IF NOT EXISTS `description`  TEXT NULL   AFTER `name`,
    ADD COLUMN IF NOT EXISTS `image_url`    VARCHAR(512) NULL AFTER `description`,
    ADD COLUMN IF NOT EXISTS `slug`         VARCHAR(140) NOT NULL DEFAULT '' AFTER `name`;

-- Back-fill slug for any rows that have none
UPDATE `categories` SET `slug` = LOWER(REPLACE(REPLACE(REPLACE(name,' ','-'),'/',''),',','')) WHERE `slug` = '' OR `slug` IS NULL;

-- ── products ────────────────────────────────────────────────
ALTER TABLE `products`
    ADD COLUMN IF NOT EXISTS `slug`             VARCHAR(200) NOT NULL DEFAULT '' AFTER `name`,
    ADD COLUMN IF NOT EXISTS `description`      TEXT NULL   AFTER `slug`,
    ADD COLUMN IF NOT EXISTS `ingredients`      TEXT NULL   AFTER `description`,
    ADD COLUMN IF NOT EXISTS `discount_price`   DECIMAL(10,2) NULL DEFAULT NULL AFTER `price`,
    ADD COLUMN IF NOT EXISTS `image_url`        VARCHAR(512) NULL AFTER `discount_price`,
    ADD COLUMN IF NOT EXISTS `is_veg`           TINYINT(1) NOT NULL DEFAULT 1 AFTER `image_url`,
    ADD COLUMN IF NOT EXISTS `is_featured`      TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_veg`,
    ADD COLUMN IF NOT EXISTS `is_best_seller`   TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_featured`,
    ADD COLUMN IF NOT EXISTS `preparation_time` INT NOT NULL DEFAULT 20 AFTER `is_best_seller`,
    ADD COLUMN IF NOT EXISTS `rating`           DECIMAL(2,1) NOT NULL DEFAULT 4.0 AFTER `preparation_time`,
    ADD COLUMN IF NOT EXISTS `sort_order`       INT NOT NULL DEFAULT 0 AFTER `rating`,
    ADD COLUMN IF NOT EXISTS `stock_status`     ENUM('in_stock','out_of_stock') NOT NULL DEFAULT 'in_stock' AFTER `sort_order`,
    ADD COLUMN IF NOT EXISTS `is_active`        TINYINT(1) NOT NULL DEFAULT 1 AFTER `stock_status`,
    ADD COLUMN IF NOT EXISTS `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `is_active`,
    ADD COLUMN IF NOT EXISTS `updated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

UPDATE `products` SET `slug` = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(name,' ','-'),'/',''),',',''),'&','and')) WHERE `slug` = '' OR `slug` IS NULL;

-- ── admin_users ─────────────────────────────────────────────
ALTER TABLE `admin_users`
    ADD COLUMN IF NOT EXISTS `role`          ENUM('super_admin','manager','staff') NOT NULL DEFAULT 'staff' AFTER `password_hash`,
    ADD COLUMN IF NOT EXISTS `is_active`     TINYINT(1) NOT NULL DEFAULT 1 AFTER `role`,
    ADD COLUMN IF NOT EXISTS `last_login_at` TIMESTAMP NULL DEFAULT NULL AFTER `is_active`,
    ADD COLUMN IF NOT EXISTS `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `last_login_at`,
    ADD COLUMN IF NOT EXISTS `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ── customers ───────────────────────────────────────────────
ALTER TABLE `customers`
    ADD COLUMN IF NOT EXISTS `phone`         VARCHAR(20) NULL AFTER `email`,
    ADD COLUMN IF NOT EXISTS `avatar_url`    VARCHAR(512) NULL AFTER `phone`,
    ADD COLUMN IF NOT EXISTS `is_active`     TINYINT(1) NOT NULL DEFAULT 1 AFTER `avatar_url`,
    ADD COLUMN IF NOT EXISTS `last_login_at` TIMESTAMP NULL DEFAULT NULL AFTER `is_active`,
    ADD COLUMN IF NOT EXISTS `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `last_login_at`,
    ADD COLUMN IF NOT EXISTS `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ── addresses ───────────────────────────────────────────────
ALTER TABLE `addresses`
    ADD COLUMN IF NOT EXISTS `label`       VARCHAR(60) NULL   AFTER `customer_id`,
    ADD COLUMN IF NOT EXISTS `full_name`   VARCHAR(120) NOT NULL DEFAULT '' AFTER `label`,
    ADD COLUMN IF NOT EXISTS `landmark`    VARCHAR(160) NULL  AFTER `address_line`,
    ADD COLUMN IF NOT EXISTS `state`       VARCHAR(100) NULL  AFTER `city`,
    ADD COLUMN IF NOT EXISTS `latitude`    DECIMAL(10,7) NULL AFTER `pincode`,
    ADD COLUMN IF NOT EXISTS `longitude`   DECIMAL(10,7) NULL AFTER `latitude`,
    ADD COLUMN IF NOT EXISTS `is_default`  TINYINT(1) NOT NULL DEFAULT 0 AFTER `longitude`,
    ADD COLUMN IF NOT EXISTS `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `is_default`,
    ADD COLUMN IF NOT EXISTS `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ── banners ─────────────────────────────────────────────────
ALTER TABLE `banners`
    ADD COLUMN IF NOT EXISTS `subtitle`   VARCHAR(255) NULL  AFTER `title`,
    ADD COLUMN IF NOT EXISTS `link_url`   VARCHAR(512) NULL  AFTER `image_url`,
    ADD COLUMN IF NOT EXISTS `cta_text`   VARCHAR(60) NULL   AFTER `link_url`,
    ADD COLUMN IF NOT EXISTS `sort_order` INT NOT NULL DEFAULT 0 AFTER `cta_text`,
    ADD COLUMN IF NOT EXISTS `is_active`  TINYINT(1) NOT NULL DEFAULT 1 AFTER `sort_order`,
    ADD COLUMN IF NOT EXISTS `starts_at`  TIMESTAMP NULL DEFAULT NULL AFTER `is_active`,
    ADD COLUMN IF NOT EXISTS `ends_at`    TIMESTAMP NULL DEFAULT NULL AFTER `starts_at`,
    ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `ends_at`,
    ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ── orders ──────────────────────────────────────────────────
ALTER TABLE `orders`
    ADD COLUMN IF NOT EXISTS `address_id`          INT UNSIGNED NULL AFTER `customer_id`,
    ADD COLUMN IF NOT EXISTS `delivery_landmark`   VARCHAR(180) NULL AFTER `delivery_address`,
    ADD COLUMN IF NOT EXISTS `subtotal`            DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `delivery_pincode`,
    ADD COLUMN IF NOT EXISTS `delivery_charge`     DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `subtotal`,
    ADD COLUMN IF NOT EXISTS `tax_amount`          DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `delivery_charge`,
    ADD COLUMN IF NOT EXISTS `discount_amount`     DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `tax_amount`,
    ADD COLUMN IF NOT EXISTS `coupon_code`         VARCHAR(40) NULL AFTER `total_amount`,
    ADD COLUMN IF NOT EXISTS `transaction_id`      VARCHAR(120) NULL AFTER `payment_status`,
    ADD COLUMN IF NOT EXISTS `delivery_boy_name`   VARCHAR(120) NULL AFTER `order_status`,
    ADD COLUMN IF NOT EXISTS `delivery_boy_phone`  VARCHAR(20) NULL AFTER `delivery_boy_name`,
    ADD COLUMN IF NOT EXISTS `notes`               TEXT NULL AFTER `delivery_boy_phone`,
    ADD COLUMN IF NOT EXISTS `placed_at`           TIMESTAMP NULL DEFAULT NULL AFTER `notes`,
    ADD COLUMN IF NOT EXISTS `confirmed_at`        TIMESTAMP NULL DEFAULT NULL AFTER `placed_at`,
    ADD COLUMN IF NOT EXISTS `delivered_at`        TIMESTAMP NULL DEFAULT NULL AFTER `confirmed_at`,
    ADD COLUMN IF NOT EXISTS `cancelled_at`        TIMESTAMP NULL DEFAULT NULL AFTER `delivered_at`,
    ADD COLUMN IF NOT EXISTS `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ── order_items ─────────────────────────────────────────────
ALTER TABLE `order_items`
    ADD COLUMN IF NOT EXISTS `product_name`  VARCHAR(160) NOT NULL DEFAULT '' AFTER `product_id`,
    ADD COLUMN IF NOT EXISTS `product_image` VARCHAR(512) NULL AFTER `product_name`,
    ADD COLUMN IF NOT EXISTS `unit_price`    DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `quantity`,
    ADD COLUMN IF NOT EXISTS `total_price`   DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `unit_price`;

-- ── payments ────────────────────────────────────────────────
ALTER TABLE `payments`
    ADD COLUMN IF NOT EXISTS `gateway`          VARCHAR(40) NULL AFTER `payment_method`,
    ADD COLUMN IF NOT EXISTS `transaction_id`   VARCHAR(160) NULL AFTER `gateway`,
    ADD COLUMN IF NOT EXISTS `currency`         CHAR(3) NOT NULL DEFAULT 'INR' AFTER `amount`,
    ADD COLUMN IF NOT EXISTS `gateway_response` TEXT NULL AFTER `status`,
    ADD COLUMN IF NOT EXISTS `updated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ── reviews ─────────────────────────────────────────────────
ALTER TABLE `reviews`
    ADD COLUMN IF NOT EXISTS `order_id`    INT UNSIGNED NULL AFTER `customer_id`,
    ADD COLUMN IF NOT EXISTS `comment`     TEXT NULL AFTER `rating`,
    ADD COLUMN IF NOT EXISTS `is_approved` TINYINT(1) NOT NULL DEFAULT 0 AFTER `comment`,
    ADD COLUMN IF NOT EXISTS `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ── delivery_zones ──────────────────────────────────────────
ALTER TABLE `delivery_zones`
    DROP INDEX IF EXISTS `uq_zone_pincode`,
    ADD COLUMN IF NOT EXISTS `delivery_charge`   DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `pincode`,
    ADD COLUMN IF NOT EXISTS `min_order_value`   DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `delivery_charge`,
    ADD COLUMN IF NOT EXISTS `estimated_minutes` INT NOT NULL DEFAULT 30 AFTER `min_order_value`,
    ADD COLUMN IF NOT EXISTS `is_active`         TINYINT(1) NOT NULL DEFAULT 1 AFTER `estimated_minutes`,
    ADD COLUMN IF NOT EXISTS `created_at`        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `is_active`,
    ADD COLUMN IF NOT EXISTS `updated_at`        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ── coupons ─────────────────────────────────────────────────
ALTER TABLE `coupons`
    ADD COLUMN IF NOT EXISTS `description`    VARCHAR(255) NULL AFTER `code`,
    ADD COLUMN IF NOT EXISTS `discount_type`  ENUM('percentage','flat') NOT NULL DEFAULT 'flat' AFTER `description`,
    ADD COLUMN IF NOT EXISTS `discount_value` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `discount_type`,
    ADD COLUMN IF NOT EXISTS `min_order_value` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `discount_value`,
    ADD COLUMN IF NOT EXISTS `max_discount`   DECIMAL(10,2) NULL DEFAULT NULL AFTER `min_order_value`,
    ADD COLUMN IF NOT EXISTS `usage_limit`    INT NOT NULL DEFAULT 0 AFTER `max_discount`,
    ADD COLUMN IF NOT EXISTS `used_count`     INT NOT NULL DEFAULT 0 AFTER `usage_limit`,
    ADD COLUMN IF NOT EXISTS `starts_at`      TIMESTAMP NULL DEFAULT NULL AFTER `used_count`,
    ADD COLUMN IF NOT EXISTS `expires_at`     TIMESTAMP NULL DEFAULT NULL AFTER `starts_at`,
    ADD COLUMN IF NOT EXISTS `is_active`      TINYINT(1) NOT NULL DEFAULT 1 AFTER `expires_at`,
    ADD COLUMN IF NOT EXISTS `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `is_active`,
    ADD COLUMN IF NOT EXISTS `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ── settings ────────────────────────────────────────────────
ALTER TABLE `settings`
    ADD COLUMN IF NOT EXISTS `group_name` VARCHAR(40) NOT NULL DEFAULT 'general' AFTER `setting_value`;

-- ── wishlist ────────────────────────────────────────────────
ALTER TABLE `wishlist`
    ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `product_id`;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Re-seed default settings (safe upsert) ─────────────────
INSERT INTO `settings` (`setting_key`, `setting_value`, `group_name`) VALUES
  ('restaurant_name',        'Zaika Lounge',                         'general'),
  ('restaurant_tagline',     'Authentic Flavours, Modern Comfort.',   'general'),
  ('logo_url',               '',                                      'general'),
  ('opening_hours',          '11:00 AM - 11:00 PM',                  'general'),
  ('footer_text',            '© 2026 Zaika Lounge. All rights reserved.', 'general'),
  ('contact_email',          'zaikalounge@gmail.com',                 'contact'),
  ('contact_phone',          '+91 7678311885',                        'contact'),
  ('whatsapp_number',        '917678311885',                          'contact'),
  ('address',                '334, Delhi Haridwar Road, Rampur Tiraha, Muzaffarnagar, Uttar Pradesh 251002', 'contact'),
  ('default_delivery_charge','40.00',                                 'delivery'),
  ('free_delivery_threshold','499.00',                                'delivery'),
  ('tax_percent',            '5.00',                                  'delivery'),
  ('currency_code',          'INR',                                   'delivery'),
  ('currency_symbol',        '₹',                                    'delivery'),
  ('min_order_value',        '99.00',                                 'delivery'),
  ('enable_razorpay',        '0',                                     'payment'),
  ('razorpay_key_id',        '',                                      'payment'),
  ('razorpay_key_secret',    '',                                      'payment'),
  ('enable_upi',             '1',                                     'payment'),
  ('upi_id',                 'zaikalounge@upi',                       'payment'),
  ('upi_payee_name',         'Zaika Lounge',                         'payment'),
  ('enable_stripe',          '0',                                     'payment'),
  ('stripe_publishable_key', '',                                      'payment'),
  ('stripe_secret_key',      '',                                      'payment'),
  ('enable_cod',             '1',                                     'payment'),
  ('enable_whatsapp_order',  '1',                                     'payment'),
  ('facebook_url',           '',                                      'social'),
  ('instagram_url',          '',                                      'social'),
  ('twitter_url',            '',                                      'social')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`), `group_name` = VALUES(`group_name`);

-- ── Sample Zaika Lounge categories ─────────────────────────
INSERT INTO `categories` (`id`,`name`,`slug`,`description`,`sort_order`,`is_active`) VALUES
  (1,'Starters',  'starters',  'Crispy & grilled starters',  1, 1),
  (2,'Biryani',   'biryani',   'Aromatic dum biryani',        2, 1),
  (3,'Curries',   'curries',   'Rich & creamy curries',       3, 1),
  (4,'Breads',    'breads',    'Tandoori breads & naans',     4, 1),
  (5,'Kebabs',    'kebabs',    'Grilled seekh & galouti',     5, 1),
  (6,'Desserts',  'desserts',  'Sweet endings',               6, 1),
  (7,'Beverages', 'beverages', 'Refreshing drinks & lassi',   7, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `slug` = VALUES(`slug`);

-- ── Sample products ─────────────────────────────────────────
INSERT INTO `products`
  (`id`,`category_id`,`name`,`slug`,`description`,`price`,`discount_price`,`image_url`,
   `is_veg`,`is_featured`,`is_best_seller`,`preparation_time`,`rating`,`sort_order`,`stock_status`,`is_active`) VALUES
  (1,1,'Seekh Kebab','seekh-kebab','Minced mutton with spices, charcoal grilled to perfection',280.00,240.00,
   'https://images.pexels.com/photos/410648/pexels-photo-410648.jpeg?auto=compress&w=600',0,1,1,20,4.8,1,'in_stock',1),
  (2,2,'Chicken Dum Biryani','chicken-dum-biryani','Hyderabadi-style slow-cooked biryani with tender chicken',320.00,280.00,
   'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&w=600',0,1,1,30,4.9,2,'in_stock',1),
  (3,3,'Butter Chicken','butter-chicken','Tender chicken in rich creamy tomato-cashew gravy',340.00,299.00,
   'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&w=600',0,1,1,25,4.7,3,'in_stock',1),
  (4,2,'Veg Biryani','veg-biryani','Fragrant basmati rice with seasonal vegetables & whole spices',220.00,189.00,
   'https://images.pexels.com/photos/1346066/pexels-photo-1346066.jpeg?auto=compress&w=600',1,1,0,25,4.5,4,'in_stock',1),
  (5,3,'Paneer Tikka Masala','paneer-tikka-masala','Grilled cottage cheese in spicy tangy tomato-onion masala',300.00,260.00,
   'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&w=600',1,1,1,20,4.6,5,'in_stock',1),
  (6,1,'Hara Bhara Kebab','hara-bhara-kebab','Pan-fried spinach & pea patties with mint chutney',180.00,149.00,
   'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&w=600',1,0,1,15,4.4,6,'in_stock',1),
  (7,5,'Galouti Kebab','galouti-kebab','Melt-in-the-mouth minced mutton kebabs, a royal Lucknawi delicacy',360.00,320.00,
   'https://images.pexels.com/photos/410648/pexels-photo-410648.jpeg?auto=compress&w=600',0,1,1,25,4.9,7,'in_stock',1),
  (8,6,'Gulab Jamun','gulab-jamun','Soft milk-solid dumplings soaked in rose-saffron sugar syrup',120.00,NULL,
   'https://images.pexels.com/photos/45202/brownie-dessert-cake-sweet-45202.jpeg?auto=compress&w=600',1,0,1,10,4.7,8,'in_stock',1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `slug` = VALUES(`slug`);

-- ── Seed banners ────────────────────────────────────────────
INSERT INTO `banners` (`id`,`title`,`subtitle`,`image_url`,`link_url`,`cta_text`,`sort_order`,`is_active`) VALUES
  (1,'Authentic Mughlai Cuisine','Rich curries, kebabs & biryanis straight from the tandoor',
   'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=1200',
   '/menu','Order Now',1,1),
  (2,'Hyderabadi Dum Biryani','Slow-cooked aromatic basmati with tender meat & saffron',
   'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=1200',
   '/menu','Try Biryani',2,1),
  (3,'Wood-Fired Tandoori Nights','Freshly grilled kebabs & naans baked in our clay oven',
   'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200',
   '/menu','Explore Starters',3,1)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- ── Admin user (password: Admin@12345) ──────────────────────
INSERT INTO `admin_users` (`id`,`name`,`email`,`password_hash`,`role`,`is_active`) VALUES
  (1,'Super Admin','admin@zaikalounge.com','$2y$12$ksjsxFl.Ct6o11EBkG6Fb.77MyClOXH9SZBOlbDR/glUVJo1H1EnS','super_admin',1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
