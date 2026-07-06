# Hostinger Deployment Audit

## Summary
The application is deployment-ready for Hostinger shared hosting when the following are in place:
- PHP 8.1+ is selected in cPanel.
- The frontend build is uploaded to the public web root.
- The PHP API is uploaded under the public web root API folder.
- A real MySQL database is created and the fresh install SQL file is imported.
- The environment values for the database and JWT secret are configured.
- The uploads directory is writable and protected from PHP execution.

## Architecture
- Frontend: Vite + React + TypeScript.
- Backend: PHP + PDO + MySQL.
- Routing: SPA fallback handled by public_html/.htaccess.
- API: PHP endpoints under api/v1 and rewritten by api/.htaccess.

## Deployment Layout
- Upload built frontend files into the public web root.
- Upload the API folder into the public web root under api/.
- Keep the uploads directory inside the public web root so generated image URLs resolve correctly.

## Environment Requirements
- DB_HOST
- DB_NAME
- DB_USER
- DB_PASS
- JWT_SECRET
- APP_DEBUG

## Production Notes
- The backend loads credentials from api/config/env.local.php when present.
- In Hostinger cPanel, environment variables are also supported via the PHP runtime.
- The app is already written to be compatible with shared hosting and does not require Composer or external libraries.

## Current Readiness Status
- Frontend build output is compatible with Hostinger.
- PHP API uses only native PHP + PDO.
- JWT handling is production-safe and requires a non-empty secret.
- Image uploads are supported with a writable uploads directory.

## Recommended Hosting Steps
1. Create a MySQL database and user in cPanel.
2. Import 01_FINAL_DATABASE.sql.
3. Upload the contents of public_html/ to the public web root.
4. Upload the contents of api/ to public_html/api/.
5. Create api/config/env.local.php with the real credentials.
6. Set the file permissions for the environment file and uploads directory.
7. Test the site and API endpoints.
