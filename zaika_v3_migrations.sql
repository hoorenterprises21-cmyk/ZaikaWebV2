-- ============================================================
-- Zaika Lounge V3 Migration Script
-- MySQL 8.0+ / Hostinger Shared Hosting Compatible
-- Phase 1: Foundation — New Tables + ALTERs
-- Backward Compatible: All changes are additive only
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- ALTER EXISTING TABLES (Additive Only)
-- ============================================================

-- 1. Add wallet, loyalty, referral, birthday to customers
ALTER TABLE `customers`
  ADD COLUMN IF NOT EXISTS `wallet_balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `avatar_url`,
  ADD COLUMN IF NOT EXISTS `loyalty_points_total` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `wallet_balance`,
  ADD COLUMN IF NOT EXISTS `referral_code` VARCHAR(20) NULL UNIQUE AFTER `loyalty_points_total`,
  ADD COLUMN IF NOT EXISTS `date_of_birth` DATE NULL AFTER `referral_code`;

-- 2. Add combo fields to products
ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `is_combo` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_best_seller`,
  ADD COLUMN IF NOT EXISTS `combo_items` JSON NULL AFTER `is_combo`,
  ADD COLUMN IF NOT EXISTS `combo_discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER `combo_items`;

-- 3. Add happy_hour_discount to order_items
ALTER TABLE `order_items`
  ADD COLUMN IF NOT EXISTS `happy_hour_discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `total_price`;

-- 4. Add wallet/loyalty fields to orders
ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `wallet_discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `discount_amount`,
  ADD COLUMN IF NOT EXISTS `loyalty_points_redeemed` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `wallet_discount`,
  ADD COLUMN IF NOT EXISTS `loyalty_points_earned` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `loyalty_points_redeemed`,
  ADD COLUMN IF NOT EXISTS `happy_hour_discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `loyalty_points_earned`,
  ADD COLUMN IF NOT EXISTS `flash_deal_discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `happy_hour_discount`;

-- ============================================================
-- NEW V3 TABLES
-- ============================================================

-- 5. Wallet Transactions
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` INT UNSIGNED NOT NULL,
  `type` ENUM('credit','debit') NOT NULL DEFAULT 'credit',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `source` ENUM('referral','loyalty','refund','birthday','streak','spin_win','manual','order') NOT NULL DEFAULT 'manual',
  `source_id` VARCHAR(60) NULL,
  `balance_after` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wallet_customer` (`customer_id`),
  KEY `idx_wallet_created` (`created_at`),
  CONSTRAINT `fk_wallet_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Loyalty Points Ledger
CREATE TABLE IF NOT EXISTS `loyalty_points` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` INT UNSIGNED NOT NULL,
  `points` INT NOT NULL DEFAULT 0,
  `type` ENUM('earn','redeem') NOT NULL DEFAULT 'earn',
  `source` ENUM('order','referral','birthday','streak','review','spin_win','manual') NOT NULL DEFAULT 'manual',
  `source_id` VARCHAR(60) NULL,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_loyalty_customer` (`customer_id`),
  CONSTRAINT `fk_loyalty_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Referral Tracking
CREATE TABLE IF NOT EXISTS `referrals` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `referrer_customer_id` INT UNSIGNED NOT NULL,
  `referred_customer_id` INT UNSIGNED NULL,
  `referral_code` VARCHAR(20) NOT NULL,
  `reward_given` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_referral_code` (`referral_code`),
  KEY `idx_referral_referrer` (`referrer_customer_id`),
  CONSTRAINT `fk_referral_referrer` FOREIGN KEY (`referrer_customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_referral_referred` FOREIGN KEY (`referred_customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Flash Deals
CREATE TABLE IF NOT EXISTS `flash_deals` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `deal_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `original_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `start_time` TIMESTAMP NOT NULL,
  `end_time` TIMESTAMP NOT NULL,
  `max_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
  `sold_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_flash_active_time` (`is_active`, `start_time`, `end_time`),
  KEY `idx_flash_product` (`product_id`),
  CONSTRAINT `fk_flash_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Happy Hours Schedule
CREATE TABLE IF NOT EXISTS `happy_hours` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `day_of_week` TINYINT NOT NULL DEFAULT 0, -- 0=Sunday, 1=Monday, ... 6=Saturday
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `discount_flat` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `product_ids` JSON NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_happyhour_day` (`day_of_week`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Spin & Win Rewards
CREATE TABLE IF NOT EXISTS `spin_win_rewards` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `label` VARCHAR(100) NOT NULL,
  `reward_type` ENUM('points','wallet','coupon','free_delivery','none') NOT NULL DEFAULT 'none',
  `reward_value` VARCHAR(60) NULL,
  `probability_weight` INT UNSIGNED NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_spin_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Employees
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NULL,
  `phone` VARCHAR(20) NULL,
  `role` ENUM('chef','delivery','manager','waiter','cashier','other') NOT NULL DEFAULT 'other',
  `salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `joining_date` DATE NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_employee_role` (`role`),
  KEY `idx_employee_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Attendance
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('present','absent','half_day','leave') NOT NULL DEFAULT 'present',
  `check_in` TIME NULL,
  `check_out` TIME NULL,
  `notes` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attendance_emp_date` (`employee_id`, `date`),
  KEY `idx_attendance_date` (`date`),
  CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Leave Requests
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `reason` TEXT NULL,
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approved_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leave_employee` (`employee_id`),
  KEY `idx_leave_status` (`status`),
  CONSTRAINT `fk_leave_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Inventory Items
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(160) NOT NULL,
  `category` VARCHAR(60) NULL,
  `unit` VARCHAR(40) NOT NULL DEFAULT 'kg',
  `current_stock` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `min_stock_level` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `cost_per_unit` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `supplier_id` INT UNSIGNED NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inventory_active` (`is_active`),
  KEY `idx_inventory_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Inventory Transactions
CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_id` INT UNSIGNED NOT NULL,
  `type` ENUM('in','out','adjustment','waste') NOT NULL DEFAULT 'in',
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `unit_cost` DECIMAL(10,2) NULL,
  `notes` VARCHAR(255) NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invtrans_item` (`item_id`),
  KEY `idx_invtrans_created` (`created_at`),
  CONSTRAINT `fk_invtrans_item` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Suppliers
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(160) NOT NULL,
  `contact_person` VARCHAR(120) NULL,
  `phone` VARCHAR(20) NULL,
  `email` VARCHAR(190) NULL,
  `address` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_type` ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `message` TEXT NULL,
  `type` ENUM('order','promo','system','wallet','loyalty') NOT NULL DEFAULT 'system',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `data_json` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_type`, `user_id`, `is_read`),
  KEY `idx_notif_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Admin Calendar Events
CREATE TABLE IF NOT EXISTS `admin_calendar_events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(160) NOT NULL,
  `description` TEXT NULL,
  `event_date` DATE NOT NULL,
  `event_type` ENUM('holiday','event','promotion','maintenance','other') NOT NULL DEFAULT 'other',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_calendar_date` (`event_date`),
  KEY `idx_calendar_type` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Testimonials (for homepage)
CREATE TABLE IF NOT EXISTS `testimonials` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_name` VARCHAR(120) NOT NULL,
  `customer_image` VARCHAR(512) NULL,
  `rating` TINYINT NOT NULL DEFAULT 5,
  `comment` TEXT NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_testimonial_active` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Statistics (for homepage counters)
CREATE TABLE IF NOT EXISTS `statistics` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `label` VARCHAR(80) NOT NULL,
  `value` INT NOT NULL DEFAULT 0,
  `suffix` VARCHAR(20) NULL,
  `icon` VARCHAR(60) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_stat_active` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Default Spin & Win rewards
INSERT INTO `spin_win_rewards` (`label`, `reward_type`, `reward_value`, `probability_weight`, `is_active`) VALUES
  ('Better Luck Next Time', 'none', NULL, 3, 1),
  ('10 Loyalty Points', 'points', '10', 4, 1),
  ('25 Loyalty Points', 'points', '25', 3, 1),
  ('₹10 Wallet Cash', 'wallet', '10', 3, 1),
  ('₹25 Wallet Cash', 'wallet', '25', 2, 1),
  ('Free Delivery', 'free_delivery', NULL, 2, 1),
  ('5% Off Coupon', 'coupon', '5PERCENT', 1, 1)
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `is_active` = VALUES(`is_active`);

-- Default testimonials
INSERT INTO `testimonials` (`customer_name`, `rating`, `comment`, `is_active`, `sort_order`) VALUES
  ('Rahul Sharma', 5, 'The biryani here is absolutely amazing! Authentic taste and generous portions. My go-to place for family dinners.', 1, 1),
  ('Priya Patel', 5, 'Best butter chicken in Muzaffarnagar. The ambiance is lovely and staff is very courteous. Highly recommended!', 1, 2),
  ('Amit Kumar', 4, 'Great food at reasonable prices. The kebabs are melt-in-mouth delicious. Delivery is always on time too.', 1, 3)
ON DUPLICATE KEY UPDATE `comment` = VALUES(`comment`), `is_active` = VALUES(`is_active`);

-- Default statistics
INSERT INTO `statistics` (`label`, `value`, `suffix`, `icon`, `sort_order`, `is_active`) VALUES
  ('Happy Customers', 5000, '+', 'users', 1, 1),
  ('Dishes Served', 25000, '+', 'utensils', 2, 1),
  ('Years of Service', 5, '', 'calendar', 3, 1),
  ('5-Star Reviews', 1200, '+', 'star', 4, 1)
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `is_active` = VALUES(`is_active`);

-- Default happy hours (Mon-Fri 2PM-5PM: 15% off)
INSERT INTO `happy_hours` (`day_of_week`, `start_time`, `end_time`, `discount_percent`, `discount_flat`, `product_ids`, `is_active`) VALUES
  (1, '14:00:00', '17:00:00', 15.00, 0.00, NULL, 1),
  (2, '14:00:00', '17:00:00', 15.00, 0.00, NULL, 1),
  (3, '14:00:00', '17:00:00', 15.00, 0.00, NULL, 1),
  (4, '14:00:00', '17:00:00', 15.00, 0.00, NULL, 1),
  (5, '14:00:00', '17:00:00', 15.00, 0.00, NULL, 1)
ON DUPLICATE KEY UPDATE `is_active` = VALUES(`is_active`);

-- Phase 3 additions
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `token` VARCHAR(64) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prt_email (email),
  INDEX idx_prt_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `cancelled_at` DATETIME NULL AFTER `delivered_at`;
