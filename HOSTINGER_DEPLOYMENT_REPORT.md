# HOSTINGER DEPLOYMENT REPORT

## PHP Compatibility
- **Required:** PHP 8.0+ (uses `str_starts_with()`, named arguments, `match` not used)
- **Hostinger:** Supports PHP 8.0-8.3 via cPanel → Select PHP Version
- **Status:** Compatible. Ensure PHP 8.1+ selected in Hostinger cPanel.

## MySQL Compatibility
- **Required:** MySQL 8.0+ (uses `ADD COLUMN IF NOT EXISTS` in alter_tables.sql)
- **Hostinger:** MySQL 8.0 on shared hosting
- **Status:** Compatible. `utf8mb4` charset fully supported.
- **Note:** `IF NOT EXISTS` on `ADD COLUMN` requires MySQL 8.0.19+. Hostinger provides 8.0.x.

## .htaccess Configuration
### public_html/.htaccess — OK
- SPA fallback routing (React Router)
- Gzip compression
- Static asset caching (7 days CSS/JS, 30 days images)
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- `Options -Indexes` (directory listing disabled)

### api/.htaccess — OK
- Blocks config/includes/bootstrap.php from direct access
- Denies .env/.sql/.md files
- CORS headers
- Route rewriting: `/api/v1/products/123` → `products.php`

### uploads/.htaccess — NEEDED
- Must disable PHP execution in uploads directory
- Must prevent .htaccess override in uploaded files

## Environment Variables
- **Method:** `api/config/env.local.php` (PHP constants)
- **Alternative:** Hostinger cPanel → Environment Variables
- **Status:** Both supported by `env.php` loader
- **Required vars:** `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `JWT_SECRET`, `APP_DEBUG`

## Upload Directory
- **Path:** `public_html/uploads/`
- **Permissions:** 755 (drwxr-xr-x)
- **Must create:** Before image upload feature works
- **.htaccess:** Needed to prevent PHP execution

## File Permissions
| Path | Permission | Purpose |
|------|-----------|---------|
| public_html/ | 755 | Web root |
| api/ | 755 | API code |
| api/config/env.local.php | 600 | Contains secrets (DB password, JWT secret) |
| uploads/ | 755 | Image uploads |
| database_schema.sql | 644 | Reference only, not web-accessible |

## Deployment Checklist
1. [ ] Set PHP version to 8.1+ in cPanel
2. [ ] Upload `public_html/` contents to web root
3. [ ] Upload `api/` to `public_html/api/`
4. [ ] Create `api/config/env.local.php` with real credentials
5. [ ] Set `env.local.php` permissions to 600
6. [ ] Import `database_schema.sql` via phpMyAdmin
7. [ ] Run `alter_tables.sql` if upgrading
8. [ ] Create `uploads/` directory with 755 permissions
9. [ ] Add `uploads/.htaccess` to disable PHP execution
10. [ ] Test API: `curl https://zaikalounge.in/api/v1/settings.php`
11. [ ] Test frontend: `https://zaikalounge.in/`
12. [ ] Test admin: `https://zaikalounge.in/admin/login`
