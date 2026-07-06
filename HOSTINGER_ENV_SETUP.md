# Hostinger Environment Setup

## 1. Create the database
In cPanel, create a new MySQL database and a database user, then assign the user to the database.

## 2. Import the SQL
Use phpMyAdmin to import [01_FINAL_DATABASE.sql](01_FINAL_DATABASE.sql).

## 3. Configure the PHP environment
Create a file at api/config/env.local.php with the live credentials.

Example:
```php
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_database_user');
define('DB_PASS', 'your_database_password');
define('JWT_SECRET', 'replace_with_a_long_random_secret');
define('APP_DEBUG', '0');
```

## 4. Set permissions
- api/config/env.local.php: 600
- uploads/: 755
- public_html/: 755

## 5. Upload the build
- Upload the contents of public_html/ to the host root.
- Upload the contents of api/ to public_html/api/.

## 6. Test the site
- https://yourdomain.com/
- https://yourdomain.com/api/v1/settings.php
- https://yourdomain.com/admin/login
