-- ============================================================
--  Rate Limiting + Uploads Migration
--  Run after database_schema.sql and alter_tables.sql
-- ============================================================

-- Login attempts table for rate limiting
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `identifier`  VARCHAR(255) NOT NULL,
  `ip_address`  VARCHAR(45) NOT NULL,
  `success`     TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_identifier` (`identifier`),
  KEY `idx_login_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Uploads tracking table
CREATE TABLE IF NOT EXISTS `uploads` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `filename`      VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `mime_type`     VARCHAR(100) NOT NULL,
  `file_size`     INT UNSIGNED NOT NULL DEFAULT 0,
  `uploaded_by`   INT UNSIGNED NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_uploads_filename` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Composite index for review queries
CREATE INDEX IF NOT EXISTS `idx_review_product_approved`
  ON `reviews` (`product_id`, `is_approved`);
