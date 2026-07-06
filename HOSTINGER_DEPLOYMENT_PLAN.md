# Hostinger Deployment Plan

## 1. Prepare the hosting environment
- Select PHP 8.1+ in cPanel.
- Create a MySQL database and user.
- Ensure the domain points to the public web root.

## 2. Import the database
- Import 01_FINAL_DATABASE.sql into the new MySQL database.

## 3. Upload the application
- Upload the contents of public_html/ to the public web root.
- Upload the contents of api/ to public_html/api/.

## 4. Configure credentials
- Create api/config/env.local.php with real database and JWT values.
- Set permissions.

## 5. Create uploads directory
- Create uploads/ under the web root.
- Add a .htaccess file to block PHP execution from uploaded files.

## 6. Verify
- Open the site and confirm the frontend loads.
- Call the settings API.
- Log in to the admin panel.
