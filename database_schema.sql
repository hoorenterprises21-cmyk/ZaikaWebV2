-- ============================================================
--  FoodieHub - Restaurant Ordering & Delivery Platform
--  Database: MySQL 8.0+
--  Target:  Hostinger Shared Hosting (phpMyAdmin import)
--  Charset: utf8mb4  (full emoji + multi-language support)
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Table: categories
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(120) NOT NULL,
  `slug`          VARCHAR(140) NOT NULL,
  `description`   TEXT NULL,
  `image_url`     VARCHAR(512) NULL,
  `sort_order`    INT NOT NULL DEFAULT 0,
  `is_active`     TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: admin_users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(120) NOT NULL,
  `email`         VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          ENUM('super_admin','manager','staff') NOT NULL DEFAULT 'staff',
  `is_active`     TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_email` (`email`),
  KEY `idx_admin_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: customers   (end-user accounts)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(120) NOT NULL,
  `email`          VARCHAR(190) NOT NULL,
  `phone`          VARCHAR(20) NULL,
  `password_hash`  VARCHAR(255) NOT NULL,
  `avatar_url`     VARCHAR(512) NULL,
  `is_active`      TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at`  TIMESTAMP NULL DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customers_email` (`email`),
  KEY `idx_customers_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: addresses  (delivery addresses per customer)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `addresses` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id`  INT UNSIGNED NOT NULL,
  `label`        VARCHAR(60) NULL,
  `full_name`    VARCHAR(120) NOT NULL,
  `phone`        VARCHAR(20) NOT NULL,
  `address_line` VARCHAR(255) NOT NULL,
  `landmark`     VARCHAR(160) NULL,
  `city`         VARCHAR(100) NOT NULL,
  `state`        VARCHAR(100) NULL,
  `pincode`      VARCHAR(20) NOT NULL,
  `latitude`     DECIMAL(10,7) NULL,
  `longitude`    DECIMAL(10,7) NULL,
  `is_default`   TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_addr_customer` (`customer_id`),
  CONSTRAINT `fk_addr_customer` FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: products   (food items / menu)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id`   INT UNSIGNED NOT NULL,
  `name`          VARCHAR(160) NOT NULL,
  `slug`          VARCHAR(200) NOT NULL,
  `description`   TEXT NULL,
  `ingredients`   TEXT NULL,
  `price`         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_price` DECIMAL(10,2) NULL DEFAULT NULL,
  `image_url`     VARCHAR(512) NULL,
  `is_veg`        TINYINT(1) NOT NULL DEFAULT 1,
  `is_featured`   TINYINT(1) NOT NULL DEFAULT 0,
  `is_best_seller` TINYINT(1) NOT NULL DEFAULT 0,
  `preparation_time` INT NOT NULL DEFAULT 20,
  `rating`        DECIMAL(2,1) NOT NULL DEFAULT 4.0,
  `sort_order`    INT NOT NULL DEFAULT 0,
  `stock_status`  ENUM('in_stock','out_of_stock') NOT NULL DEFAULT 'in_stock',
  `is_active`     TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_active` (`is_active`),
  KEY `idx_products_featured` (`is_featured`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`)
    REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: delivery_zones
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `delivery_zones` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`            VARCHAR(120) NOT NULL,
  `pincode`         VARCHAR(20) NOT NULL,
  `delivery_charge` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `min_order_value` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `estimated_minutes` INT NOT NULL DEFAULT 30,
  `is_active`       TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_zone_pincode` (`pincode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: coupons
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coupons` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`            VARCHAR(40) NOT NULL,
  `description`     VARCHAR(255) NULL,
  `discount_type`   ENUM('percentage','flat') NOT NULL DEFAULT 'flat',
  `discount_value`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `min_order_value` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `max_discount`    DECIMAL(10,2) NULL DEFAULT NULL,
  `usage_limit`     INT NOT NULL DEFAULT 0,
  `used_count`      INT NOT NULL DEFAULT 0,
  `starts_at`       TIMESTAMP NULL DEFAULT NULL,
  `expires_at`      TIMESTAMP NULL DEFAULT NULL,
  `is_active`       TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coupon_code` (`code`),
  KEY `idx_coupon_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: orders
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number`       VARCHAR(32) NOT NULL,
  `customer_id`        INT UNSIGNED NOT NULL,
  `address_id`         INT UNSIGNED NULL,
  `delivery_name`      VARCHAR(120) NOT NULL,
  `delivery_phone`     VARCHAR(20) NOT NULL,
  `delivery_address`   TEXT NOT NULL,
  `delivery_landmark`  VARCHAR(180) NULL,
  `delivery_pincode`   VARCHAR(20) NOT NULL,
  `subtotal`          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `delivery_charge`    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax_amount`         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount`    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount`       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `coupon_code`        VARCHAR(40) NULL,
  `payment_method`     ENUM('cod','upi','razorpay','stripe','whatsapp') NOT NULL DEFAULT 'cod',
  `payment_status`     ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `transaction_id`     VARCHAR(120) NULL,
  `order_status`       ENUM('pending','confirmed','preparing','out_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'pending',
  `delivery_boy_name`  VARCHAR(120) NULL,
  `delivery_boy_phone` VARCHAR(20) NULL,
  `notes`              TEXT NULL,
  `placed_at`          TIMESTAMP NULL DEFAULT NULL,
  `confirmed_at`       TIMESTAMP NULL DEFAULT NULL,
  `delivered_at`       TIMESTAMP NULL DEFAULT NULL,
  `cancelled_at`       TIMESTAMP NULL DEFAULT NULL,
  `created_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_number` (`order_number`),
  KEY `idx_orders_customer` (`customer_id`),
  KEY `idx_orders_status` (`order_status`),
  KEY `idx_orders_payment_status` (`payment_status`),
  KEY `idx_orders_created` (`created_at`),
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_address` FOREIGN KEY (`address_id`)
    REFERENCES `addresses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: order_items
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`     INT UNSIGNED NOT NULL,
  `product_id`   INT UNSIGNED NOT NULL,
  `product_name` VARCHAR(160) NOT NULL,
  `product_image` VARCHAR(512) NULL,
  `quantity`     INT NOT NULL DEFAULT 1,
  `unit_price`   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_price`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_items_order` (`order_id`),
  KEY `idx_items_product` (`product_id`),
  CONSTRAINT `fk_items_order` FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_items_product` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: payments  (transaction log for every payment attempt)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`        INT UNSIGNED NOT NULL,
  `customer_id`     INT UNSIGNED NULL,
  `payment_method`  ENUM('cod','upi','razorpay','stripe','whatsapp') NOT NULL,
  `gateway`         VARCHAR(40) NULL,
  `transaction_id`  VARCHAR(160) NULL,
  `amount`          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `currency`        CHAR(3) NOT NULL DEFAULT 'INR',
  `status`          ENUM('initiated','pending','success','failed','refunded') NOT NULL DEFAULT 'initiated',
  `gateway_response` TEXT NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pay_order` (`order_id`),
  KEY `idx_pay_customer` (`customer_id`),
  KEY `idx_pay_status` (`status`),
  CONSTRAINT `fk_pay_order` FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pay_customer` FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: banners  (homepage promotional carousel)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `banners` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(160) NOT NULL,
  `subtitle`    VARCHAR(255) NULL,
  `image_url`   VARCHAR(512) NOT NULL,
  `link_url`    VARCHAR(512) NULL,
  `cta_text`    VARCHAR(60) NULL,
  `sort_order`  INT NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `starts_at`   TIMESTAMP NULL DEFAULT NULL,
  `ends_at`     TIMESTAMP NULL DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_banner_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: reviews
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`   INT UNSIGNED NOT NULL,
  `customer_id`  INT UNSIGNED NOT NULL,
  `order_id`     INT UNSIGNED NULL,
  `rating`       TINYINT NOT NULL DEFAULT 5,
  `comment`      TEXT NULL,
  `is_approved`  TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_review_product` (`product_id`),
  KEY `idx_review_customer` (`customer_id`),
  KEY `idx_review_approved` (`is_approved`),
  CONSTRAINT `fk_review_product` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_review_customer` FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_review_order` FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: wishlist
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wishlist` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` INT UNSIGNED NOT NULL,
  `product_id`  INT UNSIGNED NOT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wishlist_cp` (`customer_id`,`product_id`),
  KEY `idx_wish_product` (`product_id`),
  CONSTRAINT `fk_wish_customer` FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wish_product` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: settings  (key/value store for global config)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key`  VARCHAR(80) NOT NULL,
  `setting_value` TEXT NULL,
  `group_name`   VARCHAR(40) NOT NULL DEFAULT 'general',
  `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_setting_key` (`setting_key`),
  KEY `idx_setting_group` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  DEFAULT SETTINGS  (single source of truth for admin panel)
-- ============================================================
INSERT INTO `settings` (`setting_key`, `setting_value`, `group_name`) VALUES
  ('restaurant_name',       'Zaika Lounge',                       'general'),
  ('restaurant_tagline',    'Authentic Flavours, Modern Comfort.',         'general'),
  ('logo_url',              '',                                'general'),
  ('primary_color',          '#ea580c',                         'general'),
  ('contact_email',         'zaikalounge@gmail.com',            'contact'),
  ('contact_phone',         '+91 7678311885',                    'contact'),
  ('whatsapp_number',       '917678311885',                    'contact'),
  ('address',               '334, Delhi Haridwar Road, Rampur Tiraha, Muzaffarnagar, Uttar Pradesh 251002',     'contact'),
  ('default_delivery_charge','40.00',                           'delivery'),
  ('free_delivery_threshold','499.00',                         'delivery'),
  ('tax_percent',           '5.00',                            'delivery'),
  ('currency_code',         'INR',                             'delivery'),
  ('currency_symbol',       '₹',                              'delivery'),
  ('min_order_value',       '99.00',                          'delivery'),
  ('enable_razorpay',       '0',                               'payment'),
  ('razorpay_key_id',       '',                                'payment'),
  ('razorpay_key_secret',   '',                                'payment'),
  ('enable_upi',            '1',                               'payment'),
  ('upi_id',                'zaikalounge@upi',                    'payment'),
  ('upi_payee_name',        'Zaika Lounge',                       'payment'),
  ('enable_stripe',         '0',                               'payment'),
  ('stripe_publishable_key','',                                'payment'),
  ('stripe_secret_key',     '',                                'payment'),
  ('enable_cod',            '1',                               'payment'),
  ('enable_whatsapp_order', '1',                               'payment'),
  ('facebook_url',          '',                                'social'),
  ('instagram_url',         '',                                'social'),
  ('twitter_url',           '',                                'social'),
  ('opening_hours',         '11:00 AM - 11:00 PM',             'general'),
  ('footer_text',           '© 2026 Zaika Lounge. All rights reserved.', 'general')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- ============================================================
--  SEED CATEGORIES & SAMPLE PRODUCTS  (removable in production)
-- ============================================================
INSERT INTO `categories` (`id`,`name`,`slug`,`description`,`sort_order`,`is_active`) VALUES
  (1,'Burgers',     'burgers',     'Juicy grilled burgers',          1, 1),
  (2,'Pizza',       'pizza',       'Wood-fired pizzas',              2, 1),
  (3,'Biryani',     'biryani',     'Aromatic dum biryani',           3, 1),
  (4,'Desserts',   'desserts',    'Sweet endings',                  4, 1),
  (5,'Beverages',   'beverages',   'Refreshing drinks',              5, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `products`
  (`id`,`category_id`,`name`,`slug`,`description`,`price`,`discount_price`,`image_url`,`is_veg`,`is_featured`,`is_best_seller`,`rating`,`stock_status`,`is_active`) VALUES
  (1,1,'Classic Veg Burger','classic-veg-burger','Crispy patty, fresh veggies, signature sauce',129.00,99.00,'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&w=600',1,1,1,4.5,'in_stock',1),
  (2,1,'Chicken Cheese Burger','chicken-cheese-burger','Grilled chicken, double cheese, toasted bun',169.00,139.00,'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&w=600',0,1,1,4.7,'in_stock',1),
  (3,2,'Margherita Pizza','margherita-pizza','Classic mozzarella & basil on wood-fired crust',299.00,249.00,'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&w=600',1,1,1,4.8,'in_stock',1),
  (4,2,'Pepperoni Pizza','pepperoni-pizza','Loaded pepperoni & extra cheese',349.00,299.00,'https://images.pexels.com/photos/803290/pexels-photo-803290.jpeg?auto=compress&w=600',0,0,1,4.6,'in_stock',1),
  (5,3,'Chicken Dum Biryani','chicken-dum-biryani','Hyderabadi-style aromatic basmati & tender chicken',219.00,189.00,'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&w=600',0,1,1,4.9,'in_stock',1),
  (6,3,'Veg Biryani','veg-biryani','Fragrant rice with farm-fresh vegetables',179.00,149.00,'https://images.pexels.com/photos/1346066/pexels-photo-1346066.jpeg?auto=compress&w=600',1,0,0,4.3,'in_stock',1),
  (7,4,'Chocolate Lava Cake','chocolate-lava-cake','Warm molten centre, vanilla scoop',129.00,NULL,'https://images.pexels.com/photos/45202/brownie-dessert-cake-sweet-45202.jpeg?auto=compress&w=600',1,1,0,4.7,'in_stock',1),
  (8,5,'Fresh Lime Soda','fresh-lime-soda','Sweet & salty, perfectly chilled',79.00,NULL,'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&w=600',1,0,0,4.2,'in_stock',1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ============================================================
--  SEED ADMIN USER  (CHANGE PASSWORD IMMEDIATELY AFTER INSTALL)
--  Default login:  admin@foodiehub.com  /  Admin@12345
--  Password hash generated with PHP password_hash() (BCRYPT)
-- ============================================================
INSERT INTO `admin_users` (`id`,`name`,`email`,`password_hash`,`role`,`is_active`) VALUES
  (1,'Super Admin','admin@zaikalounge.com','$2y$12$ksjsxFl.Ct6o11EBkG6Fb.77MyClOXH9SZBOlbDR/glUVJo1H1EnS','super_admin',1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
