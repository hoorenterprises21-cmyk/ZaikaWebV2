<?php
/**
 * Local environment overrides.
 *
 * HOW TO USE on Hostinger:
 *   1) Copy this file to api/config/env.local.php
 *   2) Fill in your real values
 *   3) DO NOT commit env.local.php to git (it is in .gitignore)
 *
 * If you already set env vars via cPanel, you can leave this file as-is.
 */

// ---- Database credentials (Hostinger: MySQL Databases in cPanel) ----
define('DB_HOST', 'localhost');
define('DB_NAME', 'zaika_lounge');
define('DB_USER', 'root');
define('DB_PASS', '');

// ---- JWT secret (use a 32+ char random string) ----
define('JWT_SECRET', 'change_this_to_a_long_random_secret_string_12345');

// ---- App debug (1 = show detailed errors, 0 = hide in production) ----
define('APP_DEBUG', '0');
